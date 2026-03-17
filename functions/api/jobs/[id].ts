import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { JobSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const job = await db.prepare(`
      SELECT j.*, c.name as customer_name, c.site_contact_email as customer_email,
             c.site_contact_phone as customer_phone, p.name as project_name
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN projects p ON j.project_id = p.id
      WHERE j.id = ?
    `).bind(id).first();

    if (!job) return errorResponse('Job not found', 404);

    // Fetch resources
    const { results: resources } = await db.prepare(`
      SELECT jr.*, a.name as asset_name, per.name as personnel_name, q.name as qualification_name
      FROM job_resources jr
      LEFT JOIN assets a ON jr.asset_id = a.id
      LEFT JOIN personnel per ON jr.personnel_id = per.id
      LEFT JOIN qualifications q ON jr.qualification_id = q.id
      WHERE jr.job_id = ?
    `).bind(id).all();

    return jsonResponse({ ...job, resources });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM jobs WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Job not found', 404);

    const parsed = await parseBody(context.request, JobSchema);
    if ('error' in parsed) return parsed.error;

    const j = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE jobs SET customer_id = ?, project_id = ?, status_id = ?, job_type = ?,
        location = ?, asset_requirement = ?, po_number = ?, job_brief = ?,
        max_weight = ?, hazards = ?, site_access = ?, pricing = ?,
        tc_accepted = ?, approver_name = ?, task_description = ?,
        inclusions = ?, exclusions = ?, include_standard_terms = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      j.customer_id, j.project_id ?? null, j.status_id, j.job_type ?? null,
      j.location ?? null, j.asset_requirement ?? null, j.po_number ?? null,
      j.job_brief ?? null, j.max_weight ?? null, j.hazards ?? null,
      j.site_access ?? null, j.pricing ?? null, j.tc_accepted ? 1 : 0,
      j.approver_name ?? null, j.task_description ?? null,
      j.inclusions ?? null, j.exclusions ?? null,
      j.include_standard_terms ? 1 : 0, timestamp, id
    ).run();

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    // Cascade: delete related records first
    await db.batch([
      db.prepare('DELETE FROM docket_line_items WHERE docket_id IN (SELECT id FROM site_dockets WHERE job_id = ?)').bind(id),
      db.prepare('DELETE FROM site_dockets WHERE job_id = ?').bind(id),
      db.prepare('DELETE FROM job_resources WHERE job_id = ?').bind(id),
      db.prepare('DELETE FROM allocations WHERE job_id = ?').bind(id),
      db.prepare('DELETE FROM job_schedules WHERE job_id = ?').bind(id),
      db.prepare('DELETE FROM jobs WHERE id = ?').bind(id),
    ]);

    return jsonResponse({ deleted: true });
  },
});
