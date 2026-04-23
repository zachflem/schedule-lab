import { getDb, jsonResponse, errorResponse, now, withRole, generateId, type BaseContext } from '../../../../../lib/db';

const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_DOCS = 10;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'POST') return withRole(['admin', 'dispatcher'], uploadDoc)(context);
  return errorResponse('Method not allowed', 405);
};

async function uploadDoc(context: BaseContext): Promise<Response> {
  const assetId = context.params.id as string;
  const maintenanceId = context.params.maintenanceId as string;
  const db = getDb(context);

  const activity = await db.prepare(
    'SELECT id FROM asset_maintenance_activities WHERE id = ? AND asset_id = ?'
  ).bind(maintenanceId, assetId).first();
  if (!activity) return errorResponse('Maintenance activity not found', 404);

  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM asset_maintenance_docs WHERE maintenance_id = ?'
  ).bind(maintenanceId).first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_DOCS) return errorResponse(`Maximum ${MAX_DOCS} documents allowed`, 400);

  let formData: FormData;
  try { formData = await context.request.formData(); } catch { return errorResponse('Expected multipart/form-data', 400); }

  const file = formData.get('doc') as File | null;
  if (!file || typeof file === 'string') return errorResponse('Missing document file', 400);
  if (!ALLOWED_DOC_TYPES.includes(file.type)) return errorResponse('Document must be a PDF, PNG, JPEG, or WebP', 400);
  if (file.size > MAX_SIZE_BYTES) return errorResponse('Document must be under 10 MB', 400);

  const docId = generateId();
  const key = `maintenance/${maintenanceId}/docs/${docId}/${file.name}`;

  await context.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  const timestamp = now();
  await db.prepare(
    'INSERT INTO asset_maintenance_docs (id, maintenance_id, file_key, file_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(docId, maintenanceId, key, file.name, timestamp).run();

  return jsonResponse({ id: docId, maintenance_id: maintenanceId, file_key: key, file_name: file.name, created_at: timestamp }, 201);
}
