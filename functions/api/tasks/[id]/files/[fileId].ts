import { getDb, jsonResponse, errorResponse, withRole, type BaseContext } from '../../../../lib/db';

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'DELETE') return withRole(['admin', 'dispatcher'], deleteFile)(context);
  return errorResponse('Method not allowed', 405);
};

async function deleteFile(context: BaseContext): Promise<Response> {
  const taskId = context.params.id as string;
  const fileId = context.params.fileId as string;
  const db = getDb(context);

  const file = await db.prepare(
    'SELECT * FROM task_files WHERE id = ? AND task_id = ?'
  ).bind(fileId, taskId).first<{ file_key: string }>();

  if (!file) return errorResponse('File not found', 404);

  await context.env.MEDIA.delete(file.file_key);
  await db.prepare('DELETE FROM task_files WHERE id = ?').bind(fileId).run();

  return jsonResponse({ success: true });
}
