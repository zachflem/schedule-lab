import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole } from '../../../lib/db';
import { z } from 'zod';

/**
 * PUT /api/projects/:id/future-jobs
 *
 * Bulk-updates all jobs in a project whose scheduled start_time is in the future.
 * This powers the "Apply to all future project jobs" checkbox in the job edit modal.
 */

const FutureJobsUpdateSchema = z.object({
  status_id:           z.string().optional(),
  location:            z.string().optional().nullable(),
  site_contact_name:   z.string().optional().nullable(),
  site_contact_email:  z.string().optional().nullable(),
  site_contact_phone:  z.string().optional().nullable(),
  job_brief:           z.string().optional().nullable(),
  po_number:           z.string().optional().nullable(),
  job_type:            z.string().optional().nullable(),
  // Resource replacement (assets + personnel)
  resources: z.array(z.object({
    resource_type: z.enum(['Asset', 'Personnel']),
    asset_id:      z.string().optional().nullable(),
    personnel_id:  z.string().optional().nullable(),
  })).optional(),
});

export const onRequest = methodRouter({
  PUT: withRole(['admin', 'dispatcher'], async (context) => {
    const project_id = context.params.id as string;
    if (!project_id) return errorResponse('Missing project ID', 400);

    const db = getDb(context);
    const body = await context.request.json() as any;
    const result = FutureJobsUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.message, 400);
    }

    const data = result.data;
    const timestamp = now();
    const nowIso = new Date().toISOString();

    // Find all future jobs for this project (those with a future schedule)
    const { results: futureJobs } = await db.prepare(`
      SELECT DISTINCT j.id
      FROM jobs j
      LEFT JOIN job_schedules js ON j.id = js.job_id
      WHERE j.project_id = ?
        AND (js.start_time > ? OR js.start_time IS NULL)
        AND j.status_id NOT IN ('Completed', 'Invoiced', 'Cancelled')
    `).bind(project_id, nowIso).all() as { results: { id: string }[] };

    if (futureJobs.length === 0) {
      return jsonResponse({ updated: 0, message: 'No future jobs to update' });
    }

    const jobIds = futureJobs.map(j => j.id);

    // Build job field updates
    const fieldUpdates: string[] = [];
    const fieldParams: any[] = [];

    const simpleFields = ['status_id', 'location', 'site_contact_name', 'site_contact_email',
      'site_contact_phone', 'job_brief', 'po_number', 'job_type'] as const;

    for (const field of simpleFields) {
      if (field in data) {
        fieldUpdates.push(`${field} = ?`);
        fieldParams.push((data as any)[field]);
      }
    }

    const batches: any[] = [];

    if (fieldUpdates.length > 0) {
      fieldUpdates.push('updated_at = ?');
      fieldParams.push(timestamp);

      const placeholders = jobIds.map(() => '?').join(',');
      batches.push(db.prepare(`
        UPDATE jobs
        SET ${fieldUpdates.join(', ')}
        WHERE id IN (${placeholders})
      `).bind(...fieldParams, ...jobIds));
    }

    // Replace resources if provided
    if (data.resources && data.resources.length > 0) {
      // Delete existing resources for these jobs
      const placeholders = jobIds.map(() => '?').join(',');
      batches.push(db.prepare(`
        DELETE FROM job_resources WHERE job_id IN (${placeholders})
      `).bind(...jobIds));

      // Insert new resources for all future jobs
      for (const jobId of jobIds) {
        for (const resource of data.resources) {
          const generateId = () => crypto.randomUUID().replace(/-/g, '');
          batches.push(db.prepare(`
            INSERT INTO job_resources (id, job_id, resource_type, asset_id, personnel_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            generateId(), jobId,
            resource.resource_type,
            resource.asset_id ?? null,
            resource.personnel_id ?? null,
            timestamp
          ));
        }
      }
    }

    if (batches.length > 0) {
      await db.batch(batches);
    }

    return jsonResponse({
      updated: jobIds.length,
      message: `Updated ${jobIds.length} future job${jobIds.length !== 1 ? 's' : ''} in this project`,
    });
  }),
});
