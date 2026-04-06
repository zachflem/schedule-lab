import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole, type BaseContext } from '../../../lib/db';
import { sendDocketIncompleteEmail } from '../../../lib/emails';

export const onRequest = methodRouter({
  /**
   * POST /api/dockets/:id/reject
   * Dispatcher/admin sends a docket back to operator with mandatory notes.
   * Unlocks the docket and notifies all assigned personnel by email.
   */
  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const id = context.params.id as string;

    let body: { notes?: string };
    try {
      body = await context.request.json() as { notes?: string };
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const notes = body?.notes?.trim();
    if (!notes) {
      return errorResponse('Dispatcher notes are required when sending a docket back', 400);
    }

    const existing = await db.prepare(
      'SELECT id, docket_status FROM site_dockets WHERE id = ?'
    ).bind(id).first<{ id: string; docket_status: string }>();

    if (!existing) return errorResponse('Docket not found', 404);

    if (existing.docket_status === 'validated') {
      return errorResponse('Cannot send back a validated docket', 409);
    }

    if (existing.docket_status === 'uncompleted' || existing.docket_status === 'draft') {
      return errorResponse('Cannot send back a docket that has not been completed by the operator', 400);
    }

    const timestamp = now();

    await db.prepare(`
      UPDATE site_dockets
      SET docket_status = 'incomplete',
          dispatcher_notes = ?,
          is_locked = 0,
          locked_at = NULL,
          updated_at = ?
      WHERE id = ?
    `).bind(notes, timestamp, id).run();

    // Fire-and-forget email to all assigned personnel
    try {
      await sendDocketIncompleteEmail(db, id, notes);
    } catch (err) {
      console.error('[Email] Failed to send docket incomplete notifications:', err);
      // Don't fail the request if email fails
    }

    return jsonResponse({ id, docket_status: 'incomplete' });
  }),
});
