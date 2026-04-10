import { getDb, jsonResponse, errorResponse, now, withRole, type BaseContext } from '../../../../../lib/db';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();

  if (method === 'GET') {
    return withRole(['admin', 'dispatcher'], serveDocument)(context);
  }
  if (method === 'POST') {
    return withRole(['admin', 'dispatcher'], uploadDocument)(context);
  }

  return errorResponse('Method not allowed', 405);
};

async function serveDocument(context: BaseContext): Promise<Response> {
  const complianceId = context.params.complianceId as string;
  const assetId = context.params.id as string;
  const db = getDb(context);

  const entry = await db.prepare(
    'SELECT document_key FROM asset_compliance WHERE id = ? AND asset_id = ?'
  ).bind(complianceId, assetId).first<{ document_key: string | null }>();

  if (!entry?.document_key) return new Response('No document found', { status: 404 });

  const object = await context.env.MEDIA.get(entry.document_key);
  if (!object) return new Response('Document not found in storage', { status: 404 });

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

async function uploadDocument(context: BaseContext): Promise<Response> {
  const complianceId = context.params.complianceId as string;
  const assetId = context.params.id as string;
  const db = getDb(context);

  const entry = await db.prepare(
    'SELECT id, document_key FROM asset_compliance WHERE id = ? AND asset_id = ?'
  ).bind(complianceId, assetId).first<{ id: string; document_key: string | null }>();

  if (!entry) return errorResponse('Compliance entry not found', 404);

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return errorResponse('Expected multipart/form-data', 400);
  }

  const file = formData.get('document') as File | null;
  if (!file || typeof file === 'string') return errorResponse('Missing document file', 400);
  if (!ALLOWED_TYPES.includes(file.type)) return errorResponse('Document must be a PDF, PNG, JPEG, or WebP', 400);
  if (file.size > MAX_SIZE_BYTES) return errorResponse('Document must be under 10 MB', 400);

  // Delete old document if present
  if (entry.document_key) {
    await context.env.MEDIA.delete(entry.document_key);
  }

  const key = `compliance/${complianceId}/${file.name}`;
  await context.env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  await db.prepare(
    'UPDATE asset_compliance SET document_key = ?, document_name = ?, updated_at = ? WHERE id = ?'
  ).bind(key, file.name, now(), complianceId).run();

  return jsonResponse({ document_key: key, document_name: file.name });
}
