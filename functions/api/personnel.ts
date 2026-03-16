import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { PersonnelSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const { results } = await db.prepare(`
      SELECT p.*, GROUP_CONCAT(q.name) as qualification_names
      FROM personnel p
      LEFT JOIN personnel_qualifications pq ON p.id = pq.personnel_id
      LEFT JOIN qualifications q ON pq.qualification_id = q.id
      GROUP BY p.id
      ORDER BY p.name
    `).all();
    return jsonResponse(results);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, PersonnelSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const p = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO personnel (id, name, email, phone, can_login, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, p.name, p.email ?? null, p.phone ?? null,
      p.can_login ? 1 : 0, timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },
});
