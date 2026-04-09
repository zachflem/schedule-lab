/**
 * Shared D1 query helpers for Cloudflare Pages Functions.
 */

export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  RESEND_API_KEY: string;
}

export type BaseContext = EventContext<Env, string, unknown>;

/** Extract D1 binding from Pages Function context */
export function getDb(context: BaseContext): D1Database {
  return context.env.DB;
}

/** Generate a new hex UUID */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** Standardised JSON success response */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Standardised JSON error response */
export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Parse + validate request JSON body against a Zod schema */
export async function parseBody<T>(
  request: Request,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { message: string } } }
): Promise<{ data: T } | { error: Response }> {
  try {
    const raw = await request.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      return { error: errorResponse(result.error!.message, 422) };
    }
    return { data: result.data! };
  } catch {
    return { error: errorResponse('Invalid JSON body', 400) };
  }
}

/** Route handler by HTTP method */
export function methodRouter(handlers: Partial<Record<string, (ctx: EventContext<Env, string, unknown>) => Promise<Response>>>) {
  return async (context: EventContext<Env, string, unknown>): Promise<Response> => {
    const method = context.request.method.toUpperCase();
    const handler = handlers[method];
    if (!handler) {
      return errorResponse(`Method ${method} not allowed`, 405);
    }
    try {
      return await handler(context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error(`[API Error] ${method} ${context.request.url}:`, err);
      return errorResponse(message, 500);
    }
  };
}

/** Get current ISO timestamp */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail({
  to,
  subject,
  content,
  fromName = 'ScheduleLab',
  apiKey,
}: {
  to: string;
  subject: string;
  content: string;
  fromName?: string;
  apiKey: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <no-reply@updates.seezed.net>`,
        to: [to],
        subject,
        html: content,
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const respText = await response.text();
      return { success: false, error: respText || `Resend Error: ${response.status}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown mail error' };
  }
}

/**
 * Helper to get a cookie value by name.
 */
export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) return value;
  }
  return null;
}

/** 
 * Fetch the current authenticated user record from the database.
 */
export async function getUser(context: BaseContext): Promise<any | null> {
  const email = context.request.headers.get('CF-Access-Authenticated-User-Email');
  if (!email) return null;

  const db = getDb(context);
  // Using LOWER() for case-insensitive lookup to be robust.
  const user = await db.prepare('SELECT * FROM personnel WHERE LOWER(email) = LOWER(?) AND can_login = 1').bind(email).first();
  
  if (user && (user as any).role === 'admin') {
    const mockRole = getCookie(context.request, 'mock-role');
    if (mockRole && ['admin', 'dispatcher', 'operator'].includes(mockRole)) {
      return { 
        ...user, 
        role: mockRole, 
        realRole: 'admin',
        isMocked: mockRole !== 'admin'
      };
    }
  }

  return user;
}

/**
 * Higher-order function to protect handlers with role-based checks.
 */
export function withRole(allowedRoles: string[], handler: (ctx: BaseContext, user: any) => Promise<Response>) {
  return async (context: BaseContext): Promise<Response> => {
    const user = await getUser(context);
    
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return errorResponse('Forbidden: Insufficient permissions', 403);
    }

    return await handler(context, user);
  };
}
