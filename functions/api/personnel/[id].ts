import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now, type BaseContext } from '../../lib/db';
import { PersonnelSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context: BaseContext) {
    const id = context.params.id as string;
    const db = getDb(context);
    
    const person = await db.prepare('SELECT * FROM personnel WHERE id = ?').bind(id).first();
    if (!person) return errorResponse('Personnel not found', 404);

    const { results: qualifications } = await db.prepare(`
      SELECT q.*, pq.expiry_date
      FROM qualifications q
      JOIN personnel_qualifications pq ON q.id = pq.qualification_id
      WHERE pq.personnel_id = ?
    `).bind(id).all();

    return jsonResponse({ ...person, qualifications });
  },

  async PUT(context: BaseContext) {
    const id = context.params.id as string;
    const parsed = await parseBody(context.request, PersonnelSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const p = parsed.data;
    const timestamp = now();

    const result = await db.prepare(`
      UPDATE personnel 
      SET name = ?, email = ?, phone = ?, can_login = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      p.name, p.email ?? null, p.phone ?? null,
      p.can_login ? 1 : 0, timestamp, id
    ).run();

    if (result.meta.changes === 0) return errorResponse('Personnel not found', 404);

    // Sync qualifications
    await db.prepare('DELETE FROM personnel_qualifications WHERE personnel_id = ?').bind(id).run();
    if (p.qualifications && p.qualifications.length > 0) {
      for (const q of p.qualifications) {
        if (!q.id) continue;
        await db.prepare(`
          INSERT INTO personnel_qualifications (id, personnel_id, qualification_id, expiry_date, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(generateId(), id, q.id, q.expiry_date ?? null, timestamp).run();
      }
    }

    return jsonResponse({ success: true });
  },

  async DELETE(context: BaseContext) {
    const id = context.params.id as string;
    const db = getDb(context);
    
    await db.prepare('DELETE FROM personnel WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }
});
