import { getDb, jsonResponse, errorResponse, methodRouter, withRole } from '../../../../lib/db';

export const onRequest = methodRouter({
  DELETE: withRole(['admin', 'dispatcher'], async (context) => {
    const assetId = context.params.id as string;
    const complianceId = context.params.complianceId as string;
    const db = getDb(context);

    const existing = await db.prepare(
      'SELECT id, document_key FROM asset_compliance WHERE id = ? AND asset_id = ?'
    ).bind(complianceId, assetId).first<{ id: string; document_key: string | null }>();

    if (!existing) return errorResponse('Compliance entry not found', 404);

    // Delete associated R2 document if present
    if (existing.document_key) {
      await context.env.MEDIA.delete(existing.document_key);
    }

    await db.prepare('DELETE FROM asset_compliance WHERE id = ?').bind(complianceId).run();
    return jsonResponse({ deleted: true });
  }),
});
