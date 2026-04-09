import { getDb, jsonResponse, errorResponse, now, withRole, type BaseContext } from '../../lib/db';

const LOGO_KEY = 'company-logo';
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();

  if (method === 'GET') {
    return serveLogo(context);
  }

  if (method === 'POST') {
    return withRole(['admin'], uploadLogo)(context);
  }

  return errorResponse('Method not allowed', 405);
};

async function serveLogo(context: BaseContext): Promise<Response> {
  const object = await context.env.ASSETS.get(LOGO_KEY);
  if (!object) {
    return new Response('No logo uploaded', { status: 404 });
  }

  const contentType = object.httpMetadata?.contentType ?? 'image/png';
  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

async function uploadLogo(context: BaseContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return errorResponse('Expected multipart/form-data', 400);
  }

  const file = formData.get('logo') as File | null;
  if (!file || typeof file === 'string') {
    return errorResponse('Missing logo file', 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse('Logo must be a PNG, JPEG, WebP, or SVG image', 400);
  }

  if (file.size > MAX_SIZE_BYTES) {
    return errorResponse('Logo must be under 2 MB', 400);
  }

  await context.env.ASSETS.put(LOGO_KEY, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // Store the absolute URL so email templates can embed it directly
  const logoUrl = `${new URL(context.request.url).origin}/api/settings/logo`;
  const db = getDb(context);
  const timestamp = now();

  await db.prepare(`
    INSERT INTO platform_settings (id, logo_url, company_name, primary_color, created_at, updated_at)
    VALUES ('global', ?, 'ScheduleLab', '#2563eb', ?, ?)
    ON CONFLICT(id) DO UPDATE SET logo_url = excluded.logo_url, updated_at = excluded.updated_at
  `).bind(logoUrl, timestamp, timestamp).run();

  return jsonResponse({ logo_url: logoUrl });
}
