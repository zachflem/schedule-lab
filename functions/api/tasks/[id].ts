import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now, withRole, type BaseContext } from '../../lib/db';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher', 'operator'], async (context: BaseContext, user) => {
    const id = context.params.id as string;
    const db = getDb(context);

    const task = await db.prepare(`
      SELECT
        t.*,
        cb.name AS created_by_name,
        cp.name AS completed_by_name,
        (
          SELECT json_group_array(json_object('id', p.id, 'name', p.name))
          FROM task_assignments ta
          JOIN personnel p ON ta.personnel_id = p.id
          WHERE ta.task_id = t.id
        ) AS assignees_json,
        (
          SELECT json_group_array(json_object('id', f.id, 'file_key', f.file_key, 'file_name', f.file_name, 'file_type', f.file_type, 'created_at', f.created_at))
          FROM task_files f
          WHERE f.task_id = t.id
        ) AS files_json
      FROM tasks t
      LEFT JOIN personnel cb ON t.created_by = cb.id
      LEFT JOIN personnel cp ON t.completed_by = cp.id
      WHERE t.id = ?
    `).bind(id).first<any>();

    if (!task) return errorResponse('Task not found', 404);

    // Operators can only see tasks assigned to them
    if (user.role === 'operator') {
      const assigned = await db.prepare(
        'SELECT 1 FROM task_assignments WHERE task_id = ? AND personnel_id = ?'
      ).bind(id, user.id).first();
      if (!assigned) return errorResponse('Forbidden', 403);
    }

    return jsonResponse({
      ...task,
      assignees: task.assignees_json ? JSON.parse(task.assignees_json).filter((a: any) => a.id !== null) : [],
      files: task.files_json ? JSON.parse(task.files_json).filter((f: any) => f.id !== null) : [],
      assignees_json: undefined,
      files_json: undefined,
    });
  }),

  PUT: withRole(['admin', 'dispatcher'], async (context: BaseContext) => {
    const id = context.params.id as string;
    let body: any;
    try { body = await context.request.json(); } catch { return errorResponse('Invalid JSON', 400); }

    const { title, description, assignee_ids } = body;
    if (!title?.trim()) return errorResponse('Task title is required', 422);

    const db = getDb(context);
    const timestamp = now();

    const result = await db.prepare(
      'UPDATE tasks SET title = ?, description = ?, updated_at = ? WHERE id = ?'
    ).bind(title.trim(), description?.trim() ?? null, timestamp, id).run();

    if (result.meta.changes === 0) return errorResponse('Task not found', 404);

    // Sync assignments
    await db.prepare('DELETE FROM task_assignments WHERE task_id = ?').bind(id).run();
    if (Array.isArray(assignee_ids)) {
      for (const personnelId of assignee_ids) {
        await db.prepare(
          'INSERT OR IGNORE INTO task_assignments (id, task_id, personnel_id, created_at) VALUES (?, ?, ?, ?)'
        ).bind(generateId(), id, personnelId, timestamp).run();
      }
    }

    return jsonResponse({ success: true });
  }),

  // PATCH is used to toggle complete/reopen
  PATCH: withRole(['admin', 'dispatcher', 'operator'], async (context: BaseContext, user) => {
    const id = context.params.id as string;
    let body: any;
    try { body = await context.request.json(); } catch { return errorResponse('Invalid JSON', 400); }

    const db = getDb(context);
    const task = await db.prepare('SELECT id, status FROM tasks WHERE id = ?').bind(id).first<any>();
    if (!task) return errorResponse('Task not found', 404);

    // Operators can only complete tasks assigned to them
    if (user.role === 'operator') {
      const assigned = await db.prepare(
        'SELECT 1 FROM task_assignments WHERE task_id = ? AND personnel_id = ?'
      ).bind(id, user.id).first();
      if (!assigned) return errorResponse('Forbidden', 403);
    }

    const { action } = body;
    const timestamp = now();

    if (action === 'complete') {
      await db.prepare(
        'UPDATE tasks SET status = ?, completed_by = ?, completed_at = ?, updated_at = ? WHERE id = ?'
      ).bind('Completed', user.id, timestamp, timestamp, id).run();
    } else if (action === 'reopen') {
      if (user.role === 'operator') return errorResponse('Forbidden', 403);
      await db.prepare(
        'UPDATE tasks SET status = ?, completed_by = NULL, completed_at = NULL, updated_at = ? WHERE id = ?'
      ).bind('Open', timestamp, id).run();
    } else {
      return errorResponse('Invalid action', 422);
    }

    return jsonResponse({ success: true });
  }),

  DELETE: withRole(['admin', 'dispatcher'], async (context: BaseContext) => {
    const id = context.params.id as string;
    const db = getDb(context);

    // Delete R2 files before removing the record
    const { results: files } = await db.prepare(
      'SELECT file_key FROM task_files WHERE task_id = ?'
    ).bind(id).all<{ file_key: string }>();

    for (const f of files) {
      await context.env.MEDIA.delete(f.file_key);
    }

    const result = await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return errorResponse('Task not found', 404);

    return jsonResponse({ success: true });
  }),
});
