import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now } from '../../lib/db';
import { AssetSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const asset = await db.prepare(`
      SELECT a.*, at.name as asset_type_name, q.name as required_qualification_name
      FROM assets a
      JOIN asset_types at ON a.asset_type_id = at.id
      LEFT JOIN qualifications q ON a.required_qualification_id = q.id
      WHERE a.id = ?
    `).bind(id).first();

    if (!asset) return errorResponse('Asset not found', 404);

    const ext = await db.prepare(
      'SELECT data FROM asset_extensions WHERE asset_id = ?'
    ).bind(id).first<{ data: string }>();

    const { results: complianceEntries } = await db.prepare(`
      SELECT ac.*, ct.name as compliance_type_name
      FROM asset_compliance ac
      JOIN compliance_types ct ON ac.compliance_type_id = ct.id
      WHERE ac.asset_id = ?
      ORDER BY ac.expiry_date ASC
    `).bind(id).all();

    return jsonResponse({
      ...asset,
      extension_data: ext ? JSON.parse(ext.data) : null,
      compliance_entries: complianceEntries,
    });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM assets WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Asset not found', 404);

    const rawBody = await context.request.json() as any;
    const result = AssetSchema.safeParse(rawBody);
    if (!result.success) return errorResponse(result.error.message, 422);

    const a = result.data;
    const timestamp = now();

    await db.batch([
      db.prepare(`
        UPDATE assets SET name = ?, asset_type_id = ?, category = ?,
          required_qualification_id = ?, rate_hourly = ?, rate_after_hours = ?,
          rate_dry_hire = ?, required_operators = ?,
          rego_expiry = ?, insurance_expiry = ?, current_machine_hours = ?,
          current_odometer = ?, service_interval_type = ?, service_interval_value = ?,
          last_service_meter_reading = ?, asset_number = ?, minimum_hire_period = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        a.name, a.asset_type_id, a.category ?? null,
        a.required_qualification_id ?? null, a.rate_hourly ?? null,
        a.rate_after_hours ?? null, a.rate_dry_hire ?? null, a.required_operators,
        a.rego_expiry ?? null, a.insurance_expiry ?? null,
        a.current_machine_hours, a.current_odometer, a.service_interval_type,
        a.service_interval_value, a.last_service_meter_reading, a.asset_number ?? null,
        a.minimum_hire_period || 0, timestamp, id
      ),
      ...(rawBody.extension_data ? [
        db.prepare(`
          INSERT INTO asset_extensions (id, asset_id, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(asset_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        `).bind(generateId(), id, JSON.stringify(rawBody.extension_data), timestamp, timestamp)
      ] : [])
    ]);

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    // Clean up R2 compliance documents before deleting the asset
    const { results: complianceEntries } = await db.prepare(
      'SELECT document_key FROM asset_compliance WHERE asset_id = ? AND document_key IS NOT NULL'
    ).bind(id).all<{ document_key: string }>();

    await db.batch([
      db.prepare('DELETE FROM asset_extensions WHERE asset_id = ?').bind(id),
      db.prepare('DELETE FROM asset_compliance WHERE asset_id = ?').bind(id),
      db.prepare('DELETE FROM assets WHERE id = ?').bind(id),
    ]);

    for (const entry of complianceEntries) {
      await context.env.MEDIA.delete(entry.document_key);
    }

    return jsonResponse({ deleted: true });
  },
});
