import { getDb, jsonResponse, errorResponse, now } from '../lib/db';

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = getDb(context);
  const userEmail = context.request.headers.get('CF-Access-Authenticated-User-Email');

  if (!userEmail) {
    return errorResponse('Not authenticated via Cloudflare Access', 401);
  }

  // Find user and check can_login
  const person = await db.prepare(
    'SELECT * FROM personnel WHERE email = ? AND can_login = 1'
  ).bind(userEmail).first();

  if (!person) {
    return errorResponse('User record not found or access denied', 403);
  }

  // Update last login date
  const timestamp = now();
  await db.prepare(
    'UPDATE personnel SET last_login_date = ?, updated_at = ? WHERE id = ?'
  ).bind(timestamp, timestamp, (person as any).id).run();

  return jsonResponse({ ...person, last_login_date: timestamp });
};
