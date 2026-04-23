import { getDb, jsonResponse, errorResponse, now, withRole, type BaseContext } from '../../../../../lib/db';

const VALID_TYPES = ['Scheduled Service', 'General Repair', 'Breakdown', 'Other'];

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher'], getActivity)(context);
  if (method === 'PUT') return withRole(['admin', 'dispatcher'], updateActivity)(context);
  if (method === 'DELETE') return withRole(['admin', 'dispatcher'], deleteActivity)(context);
  return errorResponse('Method not allowed', 405);
};

async function getActivity(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const maintenanceId = context.params.maintenanceId as string;
  const db = getDb(context);

  const row = await db.prepare(`
    SELECT
      a.*,
      (SELECT json_group_array(json_object('id', p.id, 'file_name', p.file_name, 'file_key', p.file_key, 'created_at', p.created_at, 'maintenance_id', p.maintenance_id))
       FROM asset_maintenance_photos p WHERE p.maintenance_id = a.id) AS photos,
      (SELECT json_group_array(json_object('id', d.id, 'file_name', d.file_name, 'file_key', d.file_key, 'created_at', d.created_at, 'maintenance_id', d.maintenance_id))
       FROM asset_maintenance_docs d WHERE d.maintenance_id = a.id) AS docs
    FROM asset_maintenance_activities a
    WHERE a.id = ? AND a.asset_id = ?
  `).bind(maintenanceId, assetId).first<any>();

  if (!row) return errorResponse('Maintenance activity not found', 404);

  return jsonResponse({
    ...row,
    photos: row.photos ? JSON.parse(row.photos).filter((p: any) => p.id !== null) : [],
    docs: row.docs ? JSON.parse(row.docs).filter((d: any) => d.id !== null) : [],
  });
}

async function updateActivity(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const maintenanceId = context.params.maintenanceId as string;
  const db = getDb(context);

  const existing = await db.prepare(
    'SELECT id FROM asset_maintenance_activities WHERE id = ? AND asset_id = ?'
  ).bind(maintenanceId, assetId).first();
  if (!existing) return errorResponse('Maintenance activity not found', 404);

  let body: any;
  try { body = await context.request.json(); } catch { return errorResponse('Invalid JSON', 400); }

  const { activity_type, type_other, performed_by, description, cost } = body;

  if (!activity_type || !VALID_TYPES.includes(activity_type)) return errorResponse('Invalid activity type', 422);
  if (!performed_by?.trim()) return errorResponse('Performer name is required', 422);
  if (!description?.trim()) return errorResponse('Description is required', 422);
  if (activity_type === 'Other' && !type_other?.trim()) return errorResponse('Please describe the activity type', 422);

  await db.prepare(
    'UPDATE asset_maintenance_activities SET activity_type = ?, type_other = ?, performed_by = ?, description = ?, cost = ?, updated_at = ? WHERE id = ?'
  ).bind(activity_type, type_other ?? null, performed_by.trim(), description.trim(), cost ?? null, now(), maintenanceId).run();

  return jsonResponse({ success: true });
}

async function deleteActivity(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const maintenanceId = context.params.maintenanceId as string;
  const db = getDb(context);

  const existing = await db.prepare(
    'SELECT id FROM asset_maintenance_activities WHERE id = ? AND asset_id = ?'
  ).bind(maintenanceId, assetId).first();
  if (!existing) return errorResponse('Maintenance activity not found', 404);

  // Delete associated R2 files before removing DB rows
  const { results: photos } = await db.prepare(
    'SELECT file_key FROM asset_maintenance_photos WHERE maintenance_id = ?'
  ).bind(maintenanceId).all<{ file_key: string }>();

  const { results: docs } = await db.prepare(
    'SELECT file_key FROM asset_maintenance_docs WHERE maintenance_id = ?'
  ).bind(maintenanceId).all<{ file_key: string }>();

  for (const photo of photos) await context.env.MEDIA.delete(photo.file_key);
  for (const doc of docs) await context.env.MEDIA.delete(doc.file_key);

  await db.prepare('DELETE FROM asset_maintenance_activities WHERE id = ?').bind(maintenanceId).run();

  return jsonResponse({ success: true });
}
