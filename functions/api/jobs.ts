import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { JobSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customer_id');
    const projectId = url.searchParams.get('project_id');

    let query = `
      SELECT j.*, c.name as customer_name
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) { conditions.push('j.status_id = ?'); params.push(status); }
    if (customerId) { conditions.push('j.customer_id = ?'); params.push(customerId); }
    if (projectId) { conditions.push('j.project_id = ?'); params.push(projectId); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY j.updated_at DESC';

    const { results } = await db.prepare(query).bind(...params).all();
    return jsonResponse(results);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, JobSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const j = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO jobs (id, customer_id, project_id, status_id, job_type,
        location, asset_requirement, po_number, job_brief, max_weight,
        hazards, site_access, pricing, tc_accepted, approver_name,
        task_description, inclusions, exclusions, include_standard_terms,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, j.customer_id, j.project_id ?? null, j.status_id, j.job_type ?? null,
      j.location ?? null, j.asset_requirement ?? null, j.po_number ?? null,
      j.job_brief ?? null, j.max_weight ?? null, j.hazards ?? null,
      j.site_access ?? null, j.pricing ?? null, j.tc_accepted ? 1 : 0,
      j.approver_name ?? null, j.task_description ?? null,
      j.inclusions ?? null, j.exclusions ?? null,
      j.include_standard_terms ? 1 : 0, timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },
});
