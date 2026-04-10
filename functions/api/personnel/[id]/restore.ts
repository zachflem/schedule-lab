import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole, type BaseContext } from '../../../lib/db';

export const onRequest = methodRouter({
  POST: withRole(['admin', 'dispatcher'], async (context: BaseContext) => {
    const id = context.params.id as string;
    const db = getDb(context);

    const result = await db.prepare(
      'UPDATE personnel SET archived_at = NULL, updated_at = ? WHERE id = ? AND archived_at IS NOT NULL'
    ).bind(now(), id).run();

    if (result.meta.changes === 0) return errorResponse('Archived personnel not found', 404);
    return jsonResponse({ success: true });
  }),
});
