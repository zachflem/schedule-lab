import { 
  getDb, 
  generateId, 
  jsonResponse, 
  errorResponse, 
  methodRouter, 
  now, 
  withRole 
} from '../../../lib/db';
import { 
  generateIntervalCycles, 
  generateWeekdayCycles, 
  combineDateTime,
  CycleWindow
} from '../../../lib/recurrence';

export const onRequest = methodRouter({
  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const projectId = context.params.id as string;

    // 1. Fetch active templates
    const templates = await db.prepare(`
      SELECT * FROM project_job_templates 
      WHERE project_id = ? AND status = 'Active' AND recurrence_type != 'none'
    `).bind(projectId).all().then(r => r.results as any[]);

    if (templates.length === 0) {
      return errorResponse('No active recurring job templates found for this project', 400);
    }

    // Also fetch the project for some base data
    const project = await db.prepare('SELECT customer_id, start_date, default_start_time, default_end_time FROM projects WHERE id = ?').bind(projectId).first() as any;

    const timestamp = now();
    const batches: any[] = [];
    let totalGenerated = 0;
    const allJobIds: string[] = [];

    // Process each template
    for (const template of templates) {
      // Find the last generated date for this specific template
      let startDate: Date;
      if (template.last_generated_date) {
        startDate = new Date(template.last_generated_date);
        startDate.setDate(startDate.getDate() + 1); // Start next day
      } else {
        startDate = new Date(project.start_date);
      }

      const rec = {
        type: template.recurrence_type,
        interval_value: template.recurrence_interval_value,
        interval_unit: template.recurrence_interval_unit,
        downtime_value: template.recurrence_downtime_value,
        downtime_unit: template.recurrence_downtime_unit,
        weekdays: template.recurrence_weekdays ? JSON.parse(template.recurrence_weekdays) : [],
        end_type: template.recurrence_end_type,
        end_date: template.recurrence_end_date,
        default_start_time: template.default_start_time || project.default_start_time || '07:00',
        default_end_time: template.default_end_time || project.default_end_time || '17:00',
      };

      const startTime = rec.default_start_time;
      const endTime   = rec.default_end_time;

      let cycles: CycleWindow[] = [];
      const endLimit = rec.end_type === 'date' && rec.end_date
        ? new Date(rec.end_date)
        : null;

      if (rec.type === 'interval'
        && rec.interval_value && rec.interval_unit
        && rec.downtime_value != null && rec.downtime_unit) {
        cycles = generateIntervalCycles(startDate, rec.interval_value, rec.interval_unit, rec.downtime_value, rec.downtime_unit, endLimit);
      } else if (rec.type === 'weekdays' && rec.weekdays && rec.weekdays.length > 0) {
        cycles = generateWeekdayCycles(startDate, rec.weekdays, startTime, endTime, endLimit);
      }

      if (cycles.length === 0) continue;

      let latestDate = startDate;

      for (const cycle of cycles) {
        const job_id = generateId();
        allJobIds.push(job_id);
        const cycleStart = cycle.start.toISOString();
        const cycleEnd   = cycle.end.toISOString();
        latestDate = cycle.start;

        batches.push(db.prepare(`
          INSERT INTO jobs (
            id, customer_id, project_id, status_id, job_type, location,
            asset_requirement, max_weight, hazards, site_access, task_description,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          job_id, project.customer_id, projectId,
          'Job Booked',
          template.job_type || null,
          template.location || null,
          template.asset_requirement || null,
          template.max_weight || null,
          template.hazards || null,
          template.site_access || null,
          template.task_description || null,
          timestamp, timestamp
        ));

        batches.push(db.prepare(`
          INSERT INTO job_schedules (id, job_id, start_time, end_time, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(generateId(), job_id, cycleStart, cycleEnd, timestamp));
      }

      // Update the template with the last generated date
      batches.push(db.prepare(`
        UPDATE project_job_templates SET last_generated_date = ? WHERE id = ?
      `).bind(latestDate.toISOString(), template.id));

      totalGenerated += cycles.length;
    }

    if (batches.length > 0) {
      await db.batch(batches);
    }

    if (totalGenerated === 0) {
      return jsonResponse({ message: 'No new cycles to generate (end date reached or limit hit)', count: 0 });
    }

    return jsonResponse({
      count: totalGenerated,
      job_ids: allJobIds,
      message: `Successfully generated ${totalGenerated} new job cycle${totalGenerated !== 1 ? 's' : ''} across active templates.`,
    }, 201);
  }),
});
