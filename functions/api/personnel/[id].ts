import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { PersonnelSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const person = await db.prepare('SELECT * FROM personnel WHERE id = ?').bind(id).first();
    if (!person) return errorResponse('Personnel not found', 404);

    const { results: qualifications } = await db.prepare(`
      SELECT pq.*, q.name as qualification_name, q.rate_hourly, q.rate_after_hours
      FROM personnel_qualifications pq
      JOIN qualifications q ON pq.qualification_id = q.id
      WHERE pq.personnel_id = ?
    `).bind(id).all();

    return jsonResponse({ ...person, qualifications });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM personnel WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Personnel not found', 404);

    const parsed = await parseBody(context.request, PersonnelSchema);
    if ('error' in parsed) return parsed.error;

    const p = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE personnel SET name = ?, email = ?, phone = ?, can_login = ?, updated_at = ?
      WHERE id = ?
    `).bind(p.name, p.email ?? null, p.phone ?? null, p.can_login ? 1 : 0, timestamp, id).run();

    return jsonResponse({ id });
  },
});
