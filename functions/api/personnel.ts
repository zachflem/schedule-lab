import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { PersonnelSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const { results } = await db.prepare(`
      SELECT p.*, (
        SELECT json_group_array(
          json_object(
            'id', q.id,
            'name', q.name,
            'expiry_date', pq.expiry_date
          )
        )
        FROM personnel_qualifications pq
        JOIN qualifications q ON pq.qualification_id = q.id
        WHERE pq.personnel_id = p.id
      ) as qualifications_json
      FROM personnel p
      ORDER BY p.name
    `).all();

    // Parse JSON string from SQLite
    const formatted = results.map(r => ({
      ...r,
      qualifications: JSON.parse((r as any).qualifications_json || '[]')
    }));

    return jsonResponse(formatted);
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

    // Handle qualifications if provided
    if (p.qualifications && p.qualifications.length > 0) {
      for (const q of p.qualifications) {
        if (!q.id) continue;
        await db.prepare(`
          INSERT INTO personnel_qualifications (id, personnel_id, qualification_id, expiry_date, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(generateId(), id, q.id, q.expiry_date ?? null, timestamp).run();
      }
    }

    return jsonResponse({ id }, 201);
  },
});
