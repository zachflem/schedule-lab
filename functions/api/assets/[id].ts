import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
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

    // Fetch extension data
    const ext = await db.prepare(
      'SELECT data FROM asset_extensions WHERE asset_id = ?'
    ).bind(id).first<{ data: string }>();

    return jsonResponse({ ...asset, extension_data: ext ? JSON.parse(ext.data) : null });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM assets WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Asset not found', 404);

    const parsed = await parseBody(context.request, AssetSchema);
    if ('error' in parsed) return parsed.error;

    const a = parsed.data;
    const body = await context.request.clone().json() as { extension_data?: any };
    const timestamp = now();

    await db.batch([
      db.prepare(`
        UPDATE assets SET name = ?, asset_type_id = ?, category = ?,
          required_qualification_id = ?, rate_hourly = ?, rate_after_hours = ?,
          rate_dry_hire = ?, required_operators = ?, cranesafe_expiry = ?,
          rego_expiry = ?, insurance_expiry = ?, current_machine_hours = ?,
          current_odometer = ?, service_interval_type = ?, service_interval_value = ?,
          last_service_meter_reading = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        a.name, a.asset_type_id, a.category ?? null,
        a.required_qualification_id ?? null, a.rate_hourly ?? null,
        a.rate_after_hours ?? null, a.rate_dry_hire ?? null, a.required_operators,
        a.cranesafe_expiry ?? null, a.rego_expiry ?? null, a.insurance_expiry ?? null,
        a.current_machine_hours, a.current_odometer, a.service_interval_type,
        a.service_interval_value, a.last_service_meter_reading, timestamp, id
      ),
      ...(body.extension_data ? [
        db.prepare(`
          INSERT INTO asset_extensions (id, asset_id, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(asset_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        `).bind(generateId(), id, JSON.stringify(body.extension_data), timestamp, timestamp)
      ] : [])
    ]);

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    await db.batch([
      db.prepare('DELETE FROM asset_extensions WHERE asset_id = ?').bind(id),
      db.prepare('DELETE FROM assets WHERE id = ?').bind(id),
    ]);

    return jsonResponse({ deleted: true });
  },
});
