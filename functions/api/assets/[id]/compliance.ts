import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now, withRole } from '../../../lib/db';
import { AssetComplianceSchema } from '../../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher'], async (context) => {
    const assetId = context.params.id as string;
    const db = getDb(context);

    const { results } = await db.prepare(`
      SELECT ac.*, ct.name as compliance_type_name
      FROM asset_compliance ac
      JOIN compliance_types ct ON ac.compliance_type_id = ct.id
      WHERE ac.asset_id = ?
      ORDER BY ac.expiry_date ASC
    `).bind(assetId).all();

    return jsonResponse(results);
  }),

  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const assetId = context.params.id as string;
    const db = getDb(context);

    const asset = await db.prepare('SELECT id FROM assets WHERE id = ?').bind(assetId).first();
    if (!asset) return errorResponse('Asset not found', 404);

    const raw = await context.request.json() as unknown;
    const result = AssetComplianceSchema.safeParse(raw);
    if (!result.success) return errorResponse(result.error.message, 422);

    const id = generateId();
    const timestamp = now();
    const d = result.data;

    await db.prepare(`
      INSERT INTO asset_compliance
        (id, asset_id, compliance_type_id, expiry_date, document_key, document_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asset_id, compliance_type_id) DO UPDATE SET
        expiry_date = excluded.expiry_date,
        document_key = excluded.document_key,
        document_name = excluded.document_name,
        updated_at = excluded.updated_at
    `).bind(
      id, assetId, d.compliance_type_id, d.expiry_date,
      d.document_key ?? null, d.document_name ?? null,
      timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  }),
});
