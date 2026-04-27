import { getDb, jsonResponse, errorResponse, withRole, type BaseContext } from '../../../../lib/db';

const ROLE_RANK: Record<string, number> = { operator: 1, dispatcher: 2, admin: 3 };

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher', 'operator'], serveDocument)(context);
  if (method === 'DELETE') return withRole(['admin', 'dispatcher'], deleteDocument)(context);
  return errorResponse('Method not allowed', 405);
};

async function serveDocument(context: BaseContext, user: any): Promise<Response> {
  const docId = context.params.docId as string;
  const db = getDb(context);

  const doc = await db.prepare(
    'SELECT file_key, file_name, visibility FROM project_documents WHERE id = ?'
  ).bind(docId).first<{ file_key: string; file_name: string; visibility: string }>();

  if (!doc) return new Response('Document not found', { status: 404 });

  const userRank = ROLE_RANK[user.role] ?? 1;
  const docRank = ROLE_RANK[doc.visibility] ?? 1;
  if (docRank > userRank) return new Response('Forbidden', { status: 403 });

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

async function deleteDocument(context: BaseContext): Promise<Response> {
  const docId = context.params.docId as string;
  const db = getDb(context);

  const doc = await db.prepare(
    'SELECT file_key FROM project_documents WHERE id = ?'
  ).bind(docId).first<{ file_key: string }>();

  if (!doc) return errorResponse('Document not found', 404);

  await context.env.MEDIA.delete(doc.file_key);
  await db.prepare('DELETE FROM project_documents WHERE id = ?').bind(docId).run();

  return jsonResponse({ success: true });
}
