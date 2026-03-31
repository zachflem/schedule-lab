import { getDb, jsonResponse, errorResponse, now, getUser, type BaseContext } from '../lib/db';

export const onRequest = async (context: BaseContext) => {
  const person = await getUser(context);

  if (!person) {
    return errorResponse('User record not found or access denied', 403);
  }

  // Update last login date
  const timestamp = now();
  const db = getDb(context);
  await db.prepare(
    'UPDATE personnel SET last_login_date = ?, updated_at = ? WHERE id = ?'
  ).bind(timestamp, timestamp, (person as any).id).run();

  return jsonResponse({ ...person, last_login_date: timestamp });
};
