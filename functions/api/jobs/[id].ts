import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { JobSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const job = await db.prepare(`
      SELECT j.*, c.name as customer_name, p.name as project_name
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

    const body = await context.request.json() as any;
    const result = JobSchema.partial().safeParse(body);
    if (!result.success) return errorResponse(result.error.message, 422);

    const updates: string[] = [];
    const params: any[] = [];
    const timestamp = now();

    const data = result.data as any;
    const fields = [
      'customer_id', 'project_id', 'status_id', 'job_type',
      'location', 'site_contact_name', 'site_contact_email', 'site_contact_phone',
      'asset_requirement', 'po_number', 'job_brief',
      'max_weight', 'hazards', 'site_access', 'pricing',
      'tc_accepted', 'approver_name', 'task_description',
      'inclusions', 'exclusions', 'include_standard_terms'
    ];

    for (const field of fields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        params.push(data[field] ?? null);
      }
    }

    if (updates.length === 0) return jsonResponse({ id, message: 'No changes' });

    updates.push('updated_at = ?');
    params.push(timestamp);
    params.push(id);

    await db.prepare(`
      UPDATE jobs SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

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
