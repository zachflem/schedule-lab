import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { ProjectSchema, type ProjectContact } from '../../src/shared/validation/schemas';

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
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customer_id');

    let query = `
      SELECT p.*, c.name as customer_name,
        (SELECT COUNT(*) FROM jobs WHERE project_id = p.id) as job_count,
        (SELECT COUNT(*) FROM project_job_templates WHERE project_id = p.id) as template_count,
        (
          SELECT json_group_array(json_object(
            'id', pc.id, 'name', pc.name, 'phone', pc.phone,
            'email', pc.email, 'location', pc.location, 'role', pc.role,
            'sort_order', pc.sort_order
          ))
          FROM (SELECT * FROM project_contacts WHERE project_id = p.id ORDER BY sort_order) pc
        ) as contacts_json
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) { conditions.push('p.status = ?'); params.push(status); }
    if (customerId) { conditions.push('p.customer_id = ?'); params.push(customerId); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY p.start_date DESC';

    const { results } = await db.prepare(query).bind(...params).all();
    const data = (results as any[]).map(({ contacts_json, ...row }) => ({
      ...row,
      contacts: contacts_json ? JSON.parse(contacts_json) : [],
    }));
    return jsonResponse(data);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, ProjectSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const p = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO projects (
        id, customer_id, enquiry_id, name, description,
        status, start_date, end_date, po_number,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, p.customer_id, p.enquiry_id ?? null, p.name, p.description ?? null,
      p.status, p.start_date, p.end_date, p.po_number ?? null,
      timestamp, timestamp
    ).run();

    if (p.contacts && p.contacts.length > 0) {
      await saveContacts(db, id, p.contacts);
    }

    return jsonResponse({ id }, 201);
  },
});
