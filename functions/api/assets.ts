import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { AssetSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const typeId = url.searchParams.get('asset_type_id');

    let query = `
      SELECT a.*, at.name as asset_type_name, q.name as required_qualification_name
      FROM assets a
      JOIN asset_types at ON a.asset_type_id = at.id
      LEFT JOIN qualifications q ON a.required_qualification_id = q.id
    `;
    const params: unknown[] = [];
    if (typeId) { query += ' WHERE a.asset_type_id = ?'; params.push(typeId); }
    query += ' ORDER BY a.name';

    const { results } = await db.prepare(query).bind(...params).all();
    return jsonResponse(results);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, AssetSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const a = parsed.data;
    const body = await context.request.clone().json() as { extension_data?: any };
    const timestamp = now();

    await db.batch([
      db.prepare(`
        INSERT INTO assets (id, name, asset_type_id, category, required_qualification_id,
          rate_hourly, rate_after_hours, rate_dry_hire, required_operators,
          cranesafe_expiry, rego_expiry, insurance_expiry,
          current_machine_hours, current_odometer, service_interval_type,
          service_interval_value, last_service_meter_reading, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, a.name, a.asset_type_id, a.category ?? null,
        a.required_qualification_id ?? null, a.rate_hourly ?? null,
        a.rate_after_hours ?? null, a.rate_dry_hire ?? null, a.required_operators,
        a.cranesafe_expiry ?? null, a.rego_expiry ?? null, a.insurance_expiry ?? null,
        a.current_machine_hours, a.current_odometer, a.service_interval_type,
        a.service_interval_value, a.last_service_meter_reading, timestamp, timestamp
      ),
      ...(body.extension_data ? [
        db.prepare(`
          INSERT INTO asset_extensions (id, asset_id, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(generateId(), id, JSON.stringify(body.extension_data), timestamp, timestamp)
      ] : [])
    ]);

    return jsonResponse({ id }, 201);
  },
});
