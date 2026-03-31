/**
 * Shared D1 query helpers for Cloudflare Pages Functions.
 */

export interface Env {
  DB: D1Database;
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
