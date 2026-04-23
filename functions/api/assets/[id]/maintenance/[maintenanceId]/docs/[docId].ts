import { getDb, jsonResponse, errorResponse, withRole, type BaseContext } from '../../../../../../../lib/db';

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher'], serveDoc)(context);
  if (method === 'DELETE') return withRole(['admin', 'dispatcher'], deleteDoc)(context);
  return errorResponse('Method not allowed', 405);
};

async function serveDoc(context: BaseContext): Promise<Response> {
  const docId = context.params.docId as string;
  const db = getDb(context);

  const doc = await db.prepare(
    'SELECT file_key, file_name FROM asset_maintenance_docs WHERE id = ?'
  ).bind(docId).first<{ file_key: string; file_name: string }>();
  if (!doc) return new Response('Document not found', { status: 404 });

  const object = await context.env.MEDIA.get(doc.file_key);
  if (!object) return new Response('Document not found in storage', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${doc.file_name}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

async function deleteDoc(context: BaseContext): Promise<Response> {
  const docId = context.params.docId as string;
  const db = getDb(context);

  const doc = await db.prepare(
    'SELECT file_key FROM asset_maintenance_docs WHERE id = ?'
  ).bind(docId).first<{ file_key: string }>();
  if (!doc) return errorResponse('Document not found', 404);

  await context.env.MEDIA.delete(doc.file_key);
  await db.prepare('DELETE FROM asset_maintenance_docs WHERE id = ?').bind(docId).run();

  return jsonResponse({ success: true });
}
