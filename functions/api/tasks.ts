import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now, withRole } from '../lib/db';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher', 'operator'], async (context, user) => {
    const db = getDb(context);

    let query = `
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
    `;

    const params: string[] = [];

    // Operators only see tasks assigned to them
    if (user.role === 'operator') {
      query += `
        WHERE EXISTS (
          SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.personnel_id = ?
        )
      `;
      params.push(user.id);
    }

    query += ' ORDER BY t.created_at DESC';

    const { results } = await db.prepare(query).bind(...params).all();

    const rows = results.map((row: any) => ({
      ...row,
      assignees: row.assignees_json ? JSON.parse(row.assignees_json).filter((a: any) => a.id !== null) : [],
      files: row.files_json ? JSON.parse(row.files_json).filter((f: any) => f.id !== null) : [],
      assignees_json: undefined,
      files_json: undefined,
    }));

    return jsonResponse(rows);
  }),

  POST: withRole(['admin', 'dispatcher'], async (context, user) => {
    let body: any;
    try { body = await context.request.json(); } catch { return errorResponse('Invalid JSON', 400); }

    const { title, description, assignee_ids } = body;
    if (!title?.trim()) return errorResponse('Task title is required', 422);

    const db = getDb(context);
    const id = generateId();
    const timestamp = now();

    await db.prepare(
      'INSERT INTO tasks (id, title, description, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title.trim(), description?.trim() ?? null, 'Open', user.id, timestamp, timestamp).run();

    if (Array.isArray(assignee_ids)) {
      for (const personnelId of assignee_ids) {
        await db.prepare(
          'INSERT OR IGNORE INTO task_assignments (id, task_id, personnel_id, created_at) VALUES (?, ?, ?, ?)'
        ).bind(generateId(), id, personnelId, timestamp).run();
      }
    }

    return jsonResponse({ id }, 201);
  }),
});
