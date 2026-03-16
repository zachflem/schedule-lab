import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { ProjectSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customer_id');

    let query = `
      SELECT p.*, c.name as customer_name,
        (SELECT COUNT(*) FROM jobs WHERE project_id = p.id) as job_count
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
    return jsonResponse(results);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, ProjectSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const p = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO projects (id, customer_id, enquiry_id, name, description,
        status, start_date, end_date, po_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, p.customer_id, p.enquiry_id ?? null, p.name, p.description ?? null,
      p.status, p.start_date, p.end_date, p.po_number ?? null,
      timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },
});
