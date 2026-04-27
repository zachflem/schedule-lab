import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { ProjectSchema, type ProjectContact } from '../../../src/shared/validation/schemas';

async function saveContacts(db: any, projectId: string, contacts: ProjectContact[]) {
  const statements: any[] = [
    db.prepare('DELETE FROM project_contacts WHERE project_id = ?').bind(projectId),
  ];
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    statements.push(
      db.prepare(`
        INSERT INTO project_contacts (id, project_id, name, phone, email, location, role, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId(), projectId,
        c.name,
        c.phone || null, c.email || null, c.location || null, c.role || null,
        i, now(), now()
      )
    );
  }
  await db.batch(statements);
}

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const project = await db.prepare(`
      SELECT p.*, c.name as customer_name
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.id = ?
    `).bind(id).first();

    if (!project) return errorResponse('Project not found', 404);

    const { results: jobs } = await db.prepare(`
      SELECT id, status_id, location, asset_requirement, created_at
      FROM jobs WHERE project_id = ? ORDER BY created_at
    `).bind(id).all();

    const { results: contacts } = await db.prepare(`
      SELECT id, name, phone, email, location, role, sort_order
      FROM project_contacts WHERE project_id = ? ORDER BY sort_order
    `).bind(id).all();

    return jsonResponse({ ...project, jobs, contacts });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Project not found', 404);

    const parsed = await parseBody(context.request, ProjectSchema);
    if ('error' in parsed) return parsed.error;

    const p = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE projects SET
        customer_id = ?,
        name = ?,
        description = ?,
        status = ?,
        start_date = ?,
        end_date = ?,
        po_number = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      p.customer_id, p.name, p.description ?? null, p.status,
      p.start_date, p.end_date, p.po_number ?? null,
      timestamp, id
    ).run();

    await saveContacts(db, id, p.contacts ?? []);

    return jsonResponse({ id });
  },
});
