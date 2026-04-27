import { getDb, jsonResponse, errorResponse, now, withRole, generateId, type BaseContext } from '../../../lib/db';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

const ROLE_RANK: Record<string, number> = { operator: 1, dispatcher: 2, admin: 3 };

export const onRequest = async (context: BaseContext): Promise<Response> => {
  const method = context.request.method.toUpperCase();
  if (method === 'GET') return withRole(['admin', 'dispatcher', 'operator'], listDocuments)(context);
  if (method === 'POST') return withRole(['admin', 'dispatcher'], uploadDocument)(context);
  return errorResponse('Method not allowed', 405);
};

async function listDocuments(context: BaseContext, user: any): Promise<Response> {
  const projectId = context.params.id as string;
  const db = getDb(context);

  const { results } = await db.prepare(`
    SELECT id, project_id, file_key, file_name, file_type, label, visibility, sort_order, created_at
    FROM project_documents
    WHERE project_id = ?
    ORDER BY sort_order, created_at
  `).bind(projectId).all();

  const userRank = ROLE_RANK[user.role] ?? 1;
  const visible = (results as any[]).filter(doc => (ROLE_RANK[doc.visibility] ?? 1) <= userRank);

  return jsonResponse(visible);
}

async function uploadDocument(context: BaseContext): Promise<Response> {
  const projectId = context.params.id as string;
  const db = getDb(context);

  const project = await db.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
  if (!project) return errorResponse('Project not found', 404);

  let formData: FormData;
  try { formData = await context.request.formData(); } catch { return errorResponse('Expected multipart/form-data', 400); }

  const file = formData.get('file') as File | null;
  if (!file || typeof file === 'string') return errorResponse('Missing file', 400);
  if (!ALLOWED_TYPES.includes(file.type)) return errorResponse('Unsupported file type', 400);
  if (file.size > MAX_SIZE_BYTES) return errorResponse('File must be under 20 MB', 400);

  const label = (formData.get('label') as string | null) ?? null;
  const visibility = (formData.get('visibility') as string | null) ?? 'dispatcher';
  if (!['operator', 'dispatcher', 'admin'].includes(visibility)) {
    return errorResponse('Invalid visibility value', 400);
  }

  const countResult = await db.prepare(
    'SELECT COUNT(*) as count FROM project_documents WHERE project_id = ?'
  ).bind(projectId).first<{ count: number }>();
  const sortOrder = countResult?.count ?? 0;

  const docId = generateId();
  const key = `projects/${projectId}/documents/${docId}/${file.name}`;

  await context.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  const timestamp = now();
  await db.prepare(
    'INSERT INTO project_documents (id, project_id, file_key, file_name, file_type, label, visibility, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(docId, projectId, key, file.name, file.type, label, visibility, sortOrder, timestamp).run();

  return jsonResponse({ id: docId, project_id: projectId, file_key: key, file_name: file.name, file_type: file.type, label, visibility, sort_order: sortOrder, created_at: timestamp }, 201);
}
