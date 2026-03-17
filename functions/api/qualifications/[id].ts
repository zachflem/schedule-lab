import { getDb, jsonResponse, errorResponse, methodRouter, now } from '../../lib/db';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const qual = await db.prepare(
      'SELECT * FROM qualifications WHERE id = ?'
    ).bind(id).first();

    if (!qual) return errorResponse('Qualification not found', 404);

    return jsonResponse(qual);
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;
    const body = await context.request.json() as any;

    await db.prepare(`
      UPDATE qualifications SET name = ?, rate_hourly = ?, rate_after_hours = ?
      WHERE id = ?
    `).bind(body.name, body.rate_hourly ?? 0, body.rate_after_hours ?? 0, id).run();

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    await db.prepare('DELETE FROM qualifications WHERE id = ?').bind(id).run();

    return jsonResponse({ deleted: true });
  },
});
