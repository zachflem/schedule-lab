import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole, type BaseContext } from '../../../lib/db';

export const onRequest = methodRouter({
  /**
   * POST /api/dockets/:id/validate
   * Dispatchers/admins lock a completed docket as validated.
   */
  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare(
      'SELECT id, docket_status FROM site_dockets WHERE id = ?'
    ).bind(id).first<{ id: string; docket_status: string }>();

    if (!existing) return errorResponse('Docket not found', 404);

    if (existing.docket_status === 'validated') {
      return errorResponse('Docket is already validated', 409);
    }

    if (existing.docket_status === 'uncompleted' || existing.docket_status === 'draft') {
      return errorResponse('Cannot validate a docket that has not been completed by the operator', 400);
    }

    const timestamp = now();

    await db.prepare(`
      UPDATE site_dockets
      SET docket_status = 'validated',
          is_locked = 1,
          locked_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(timestamp, timestamp, id).run();

    return jsonResponse({ id, docket_status: 'validated' });
  }),
});
