import { getDb, jsonResponse, errorResponse, methodRouter, now } from '../../lib/db';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const enquiry = await db.prepare(`
      SELECT e.*, at.name as asset_type_name
      FROM enquiries e
      LEFT JOIN asset_types at ON e.asset_type_id = at.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!enquiry) return errorResponse('Enquiry not found', 404);
    return jsonResponse(enquiry);
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM enquiries WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Enquiry not found', 404);

    const body = await context.request.json() as any;
    const timestamp = now();

    const allowedFields = ['status', 'dispatcher_notes', 'is_trashed'];
    const updates: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        params.push(field === 'is_trashed' ? (body[field] ? 1 : 0) : body[field]);
      }
    }

    if (updates.length === 0) return errorResponse('No fields to update', 400);

    updates.push('updated_at = ?');
    params.push(timestamp, id);

    await db.prepare(`
      UPDATE enquiries SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;
    await db.prepare('DELETE FROM enquiries WHERE id = ?').bind(id).run();
    return jsonResponse({ deleted: true });
  },
});
