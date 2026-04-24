import { getDb, jsonResponse, errorResponse, withRole, type BaseContext } from '../lib/db';

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher'], listAll)(context);
  return errorResponse('Method not allowed', 405);
};

async function listAll(context: BaseContext): Promise<Response> {
  const db = getDb(context);
  const url = new URL(context.request.url);
  const from = url.searchParams.get('from'); // YYYY-MM-DD, optional
  const to   = url.searchParams.get('to');   // YYYY-MM-DD, optional

  let sql = `
    SELECT
      a.id,
      a.asset_id,
      ast.name   AS asset_name,
      ast.service_interval_type,
      ast.current_machine_hours,
      ast.current_odometer,
      a.activity_type,
      a.type_other,
      a.performed_by,
      a.description,
      a.cost,
      a.performed_at,
      a.meter_reading,
      a.created_at,
      (SELECT COUNT(*) FROM asset_maintenance_photos p WHERE p.maintenance_id = a.id) AS photo_count,
      (SELECT COUNT(*) FROM asset_maintenance_docs   d WHERE d.maintenance_id = a.id) AS doc_count
    FROM asset_maintenance_activities a
    JOIN assets ast ON ast.id = a.asset_id
    WHERE 1=1
  `;

  const bindings: (string | null)[] = [];

  if (from) {
    sql += ` AND substr(COALESCE(a.performed_at, a.created_at), 1, 10) >= ?`;
    bindings.push(from);
  }
  if (to) {
    sql += ` AND substr(COALESCE(a.performed_at, a.created_at), 1, 10) <= ?`;
    bindings.push(to);
  }

  sql += ` ORDER BY COALESCE(a.performed_at, a.created_at) DESC`;

  const { results } = await db.prepare(sql).bind(...bindings).all();
  return jsonResponse(results);
}
