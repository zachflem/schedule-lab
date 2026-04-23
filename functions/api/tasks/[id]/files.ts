import { getDb, jsonResponse, errorResponse, now, withRole, generateId, type BaseContext } from '../../../lib/db';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILES = 3;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'POST') return withRole(['admin', 'dispatcher'], uploadFile)(context);
  return errorResponse('Method not allowed', 405);
};

async function uploadFile(context: BaseContext): Promise<Response> {
  const taskId = context.params.id as string;
  const db = getDb(context);

  const task = await db.prepare('SELECT id FROM tasks WHERE id = ?').bind(taskId).first();
  if (!task) return errorResponse('Task not found', 404);

  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM task_files WHERE task_id = ?'
  ).bind(taskId).first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_FILES) {
    return errorResponse(`Maximum ${MAX_FILES} files allowed per task`, 400);
  }

  let formData: FormData;
  try { formData = await context.request.formData(); } catch { return errorResponse('Expected multipart/form-data', 400); }

  const file = formData.get('file') as File | null;
  if (!file || typeof file === 'string') return errorResponse('Missing file', 400);
  if (!ALLOWED_TYPES.includes(file.type)) return errorResponse('Unsupported file type', 400);
  if (file.size > MAX_SIZE_BYTES) return errorResponse('File must be under 10 MB', 400);

  const fileId = generateId();
  const key = `tasks/${taskId}/files/${fileId}/${file.name}`;

  await context.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  const timestamp = now();
  await db.prepare(
    'INSERT INTO task_files (id, task_id, file_key, file_name, file_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(fileId, taskId, key, file.name, file.type, timestamp).run();

  return jsonResponse({ id: fileId, task_id: taskId, file_key: key, file_name: file.name, file_type: file.type, created_at: timestamp }, 201);
}
