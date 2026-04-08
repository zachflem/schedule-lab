import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../../lib/db';
import { ProjectJobTemplateSchema } from '../../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const projectId = context.params.id as string;

    const { results } = await db.prepare(`
      SELECT * FROM project_job_templates 
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).bind(projectId).all();

    // Parse the weekdays back to JSON for the frontend
    const parsedResults = results.map((r: any) => ({
      ...r,
      recurrence_weekdays: r.recurrence_weekdays ? JSON.parse(r.recurrence_weekdays) : null
    }));

    return jsonResponse(parsedResults);
  },

  async POST(context) {
    const db = getDb(context);
    const projectId = context.params.id as string;
    
    // Ensure project exists
    const proj = await db.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
    if (!proj) return errorResponse('Project not found', 404);

    const parsed = await parseBody(context.request, ProjectJobTemplateSchema);
    if ('error' in parsed) return parsed.error;

    const id = generateId();
    const t = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO project_job_templates (
        id, project_id, name, job_type, location, asset_requirement,
        max_weight, hazards, site_access, task_description, status,
        recurrence_type, recurrence_interval_value, recurrence_interval_unit,
        recurrence_downtime_value, recurrence_downtime_unit,
        recurrence_weekdays, recurrence_end_type, recurrence_end_date,
        default_start_time, default_end_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, projectId, t.name, t.job_type ?? null, t.location ?? null, t.asset_requirement ?? null,
      t.max_weight ?? null, t.hazards ?? null, t.site_access ?? null, t.task_description ?? null,
      t.status ?? 'Active',
      t.recurrence_type ?? 'none',
      t.recurrence_interval_value ?? null, t.recurrence_interval_unit ?? null,
      t.recurrence_downtime_value ?? null, t.recurrence_downtime_unit ?? null,
      t.recurrence_weekdays ? JSON.stringify(t.recurrence_weekdays) : null,
      t.recurrence_end_type ?? 'ongoing', t.recurrence_end_date ?? null,
      t.default_start_time ?? null, t.default_end_time ?? null,
      timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  }
});
