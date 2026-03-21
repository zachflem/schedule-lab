import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { JobSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const statuses = url.searchParams.getAll('status');
    const customerId = url.searchParams.get('customer_id');
    const projectId = url.searchParams.get('project_id');

    let query = `
      SELECT j.*, c.name as customer_name, js.start_time, js.end_time
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN job_schedules js ON j.id = js.job_id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (statuses.length > 0) {
      conditions.push(`j.status_id IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
    if (customerId) { conditions.push('j.customer_id = ?'); params.push(customerId); }
    if (projectId) { conditions.push('j.project_id = ?'); params.push(projectId); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY j.updated_at DESC';

    const { results: jobs } = await db.prepare(query).bind(...params).all() as { results: any[] };

    // If requested, fetch resources for each job (N+1 but small dataset, or batch)
    // For Gantt chart we usually need resources to display on the correct lane
    if (url.searchParams.get('include') === 'resources') {
      for (const job of jobs) {
        const { results: resources } = await db.prepare(`
          SELECT jr.*, a.name as asset_name, a.asset_number, per.name as personnel_name
          FROM job_resources jr
          LEFT JOIN assets a ON jr.asset_id = a.id
          LEFT JOIN personnel per ON jr.personnel_id = per.id
          WHERE jr.job_id = ?
        `).bind(job.id).all();
        job.resources = resources;
      }
    }

    return jsonResponse(jobs);
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
        location, site_contact_name, site_contact_email, site_contact_phone,
        asset_requirement, po_number, job_brief, max_weight,
        hazards, site_access, pricing, tc_accepted, approver_name,
        task_description, inclusions, exclusions, include_standard_terms,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, j.customer_id, j.project_id ?? null, j.status_id, j.job_type ?? null,
      j.location ?? null, j.site_contact_name ?? null, j.site_contact_email ?? null, j.site_contact_phone ?? null,
      j.asset_requirement ?? null, j.po_number ?? null,
      j.job_brief ?? null, j.max_weight ?? null, j.hazards ?? null,
      j.site_access ?? null, j.pricing ?? null, j.tc_accepted ? 1 : 0,
      j.approver_name ?? null, j.task_description ?? null,
      j.inclusions ?? null, j.exclusions ?? null,
      j.include_standard_terms ? 1 : 0, timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },
});
