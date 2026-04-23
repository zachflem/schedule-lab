import { getDb, jsonResponse, errorResponse, now, withRole, generateId, type BaseContext } from '../../../../lib/db';

const VALID_TYPES = ['Scheduled Service', 'General Repair', 'Breakdown', 'Other'];

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher'], listActivities)(context);
  if (method === 'POST') return withRole(['admin', 'dispatcher'], createActivity)(context);
  return errorResponse('Method not allowed', 405);
};

async function listActivities(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const db = getDb(context);

  const { results } = await db.prepare(`
    SELECT
      a.*,
      (SELECT json_group_array(json_object('id', p.id, 'file_name', p.file_name, 'file_key', p.file_key, 'created_at', p.created_at, 'maintenance_id', p.maintenance_id))
       FROM asset_maintenance_photos p WHERE p.maintenance_id = a.id) AS photos,
      (SELECT json_group_array(json_object('id', d.id, 'file_name', d.file_name, 'file_key', d.file_key, 'created_at', d.created_at, 'maintenance_id', d.maintenance_id))
       FROM asset_maintenance_docs d WHERE d.maintenance_id = a.id) AS docs
    FROM asset_maintenance_activities a
    WHERE a.asset_id = ?
    ORDER BY a.created_at DESC
  `).bind(assetId).all();

  const rows = results.map((row: any) => ({
    ...row,
    photos: row.photos ? JSON.parse(row.photos).filter((p: any) => p.id !== null) : [],
    docs: row.docs ? JSON.parse(row.docs).filter((d: any) => d.id !== null) : [],
  }));

  return jsonResponse(rows);
}

async function createActivity(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const db = getDb(context);

  let body: any;
  try { body = await context.request.json(); } catch { return errorResponse('Invalid JSON', 400); }

  const { activity_type, type_other, performed_by, description, cost } = body;

  if (!activity_type || !VALID_TYPES.includes(activity_type)) return errorResponse('Invalid activity type', 422);
  if (!performed_by?.trim()) return errorResponse('Performer name is required', 422);
  if (!description?.trim()) return errorResponse('Description is required', 422);
  if (activity_type === 'Other' && !type_other?.trim()) return errorResponse('Please describe the activity type', 422);

  const id = generateId();
  const timestamp = now();

  await db.prepare(
    'INSERT INTO asset_maintenance_activities (id, asset_id, activity_type, type_other, performed_by, description, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, assetId, activity_type, type_other ?? null, performed_by.trim(), description.trim(), cost ?? null, timestamp, timestamp).run();

  return jsonResponse({ id }, 201);
}
