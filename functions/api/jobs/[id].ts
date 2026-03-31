import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now, withRole } from '../../lib/db';
import { JobSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher', 'operator'], async (context, user) => {
    const db = getDb(context);
    const id = context.params.id as string;

    if (user.role === 'operator') {
      const isAssigned = await db.prepare(
        'SELECT 1 FROM job_resources WHERE job_id = ? AND personnel_id = ?'
      ).bind(id, user.id).first();
      
      if (!isAssigned) {
        return errorResponse('Forbidden: You are not assigned to this job', 403);
      }
    }

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
  }),

  PUT: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM jobs WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Job not found', 404);

    const body = await context.request.json() as any;
    const result = JobSchema.partial().safeParse(body);
    if (!result.success) return errorResponse(result.error.message, 422);

    const batch: any[] = [];
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

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(timestamp);
      params.push(id);

      batch.push(
        db.prepare(`
          UPDATE jobs SET ${updates.join(', ')}
          WHERE id = ?
        `).bind(...params)
      );
    }

    // Handle schedule updates if provided (start_time/end_time)
    if (data.start_time || data.end_time) {
      // 1. Clear existing schedule for this job
      batch.push(db.prepare('DELETE FROM job_schedules WHERE job_id = ?').bind(id));

      // 2. Insert new schedule if both are present
      if (data.start_time && data.end_time) {
        batch.push(
          db.prepare(`
            INSERT INTO job_schedules (id, job_id, start_time, end_time, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            new Date(data.start_time).toISOString(),
            new Date(data.end_time).toISOString(),
            timestamp
          )
        );
        
        // Auto-update status if it was Job Booked or similar
        if (data.status_id === 'Job Booked' || !data.status_id) {
           batch.push(db.prepare('UPDATE jobs SET status_id = ? WHERE id = ?').bind('Job Scheduled', id));
        }
      }
    }

    // Handle resource updates if provided
    if (body.resources && Array.isArray(body.resources)) {
      // 1. Clear existing resources for this job
      batch.push(db.prepare('DELETE FROM job_resources WHERE job_id = ?').bind(id));

      // 2. Insert new resources
      for (const res of body.resources) {
        batch.push(
          db.prepare(`
            INSERT INTO job_resources (id, job_id, resource_type, asset_id, personnel_id, qualification_id, rate_type, rate_amount, qty, total, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            res.id || (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)),
            id,
            res.resource_type,
            res.asset_id || null,
            res.personnel_id || null,
            res.qualification_id || null,
            res.rate_type || null,
            res.rate_amount || 0,
            res.qty || 1,
            res.total || 0,
            timestamp
          )
        );
      }
    }

    if (batch.length === 0) return jsonResponse({ id, message: 'No changes' });

    await db.batch(batch);

    return jsonResponse({ id });
  }),

  DELETE: withRole(['admin', 'dispatcher'], async (context) => {
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
  }),
});
