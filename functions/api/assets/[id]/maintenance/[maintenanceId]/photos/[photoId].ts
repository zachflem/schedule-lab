import { getDb, jsonResponse, errorResponse, withRole, type BaseContext } from '../../../../../../../lib/db';

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher'], servePhoto)(context);
  if (method === 'DELETE') return withRole(['admin', 'dispatcher'], deletePhoto)(context);
  return errorResponse('Method not allowed', 405);
};

async function servePhoto(context: BaseContext): Promise<Response> {
  const photoId = context.params.photoId as string;
  const db = getDb(context);

  const photo = await db.prepare(
    'SELECT file_key FROM asset_maintenance_photos WHERE id = ?'
  ).bind(photoId).first<{ file_key: string }>();
  if (!photo) return new Response('Photo not found', { status: 404 });

  const object = await context.env.MEDIA.get(photo.file_key);
  if (!object) return new Response('Photo not found in storage', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

async function deletePhoto(context: BaseContext): Promise<Response> {
  const photoId = context.params.photoId as string;
  const db = getDb(context);

  const photo = await db.prepare(
    'SELECT file_key FROM asset_maintenance_photos WHERE id = ?'
  ).bind(photoId).first<{ file_key: string }>();
  if (!photo) return errorResponse('Photo not found', 404);

  await context.env.MEDIA.delete(photo.file_key);
  await db.prepare('DELETE FROM asset_maintenance_photos WHERE id = ?').bind(photoId).run();

  return jsonResponse({ success: true });
}
