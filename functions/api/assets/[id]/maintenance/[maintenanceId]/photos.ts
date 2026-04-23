import { getDb, jsonResponse, errorResponse, now, withRole, generateId, type BaseContext } from '../../../../../../lib/db';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS = 10;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'POST') return withRole(['admin', 'dispatcher'], uploadPhoto)(context);
  return errorResponse('Method not allowed', 405);
};

async function uploadPhoto(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const maintenanceId = context.params.maintenanceId as string;
  const db = getDb(context);

  const activity = await db.prepare(
    'SELECT id FROM asset_maintenance_activities WHERE id = ? AND asset_id = ?'
  ).bind(maintenanceId, assetId).first();
  if (!activity) return errorResponse('Maintenance activity not found', 404);

  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM asset_maintenance_photos WHERE maintenance_id = ?'
  ).bind(maintenanceId).first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_PHOTOS) return errorResponse(`Maximum ${MAX_PHOTOS} photos allowed`, 400);

  let formData: FormData;
  try { formData = await context.request.formData(); } catch { return errorResponse('Expected multipart/form-data', 400); }

  const file = formData.get('photo') as File | null;
  if (!file || typeof file === 'string') return errorResponse('Missing photo file', 400);
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return errorResponse('Photo must be JPEG, PNG, or WebP', 400);
  if (file.size > MAX_SIZE_BYTES) return errorResponse('Photo must be under 10 MB', 400);

  const photoId = generateId();
  const key = `maintenance/${maintenanceId}/photos/${photoId}/${file.name}`;

  await context.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  const timestamp = now();
  await db.prepare(
    'INSERT INTO asset_maintenance_photos (id, maintenance_id, file_key, file_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(photoId, maintenanceId, key, file.name, timestamp).run();

  return jsonResponse({ id: photoId, maintenance_id: maintenanceId, file_key: key, file_name: file.name, created_at: timestamp }, 201);
}
