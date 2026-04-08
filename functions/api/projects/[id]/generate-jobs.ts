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

    // 1. Fetch Project
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first() as any;
    if (!project) return errorResponse('Project not found', 404);

    if (project.recurrence_type === 'none') {
      return errorResponse('Project is not configured for recurrence', 400);
    }

    // 2. Determine start point (after the last existing job)
    const lastJob = await db.prepare(`
      SELECT js.start_time 
      FROM jobs j 
      JOIN job_schedules js ON j.id = js.job_id 
      WHERE j.project_id = ? 
      ORDER BY js.start_time DESC 
      LIMIT 1
    `).bind(projectId).first() as any;

    let startDate: Date;
    if (lastJob?.start_time) {
      // Start after the last job's start time
      startDate = new Date(lastJob.start_time);
      // Move to the next day to avoid overlapping the last job
      startDate.setDate(startDate.getDate() + 1);
    } else {
      startDate = new Date(project.start_date);
    }

    const rec = {
      type: project.recurrence_type,
      interval_value: project.recurrence_interval_value,
      interval_unit: project.recurrence_interval_unit,
      downtime_value: project.recurrence_downtime_value,
      downtime_unit: project.recurrence_downtime_unit,
      weekdays: project.recurrence_weekdays ? JSON.parse(project.recurrence_weekdays) : [],
      end_type: project.recurrence_end_type,
      end_date: project.recurrence_end_date,
      default_start_time: project.default_start_time || '07:00',
      default_end_time: project.default_end_time || '17:00',
    };

    const startTime = rec.default_start_time;
    const endTime   = rec.default_end_time;

    // 3. Generate job cycles
    let cycles: CycleWindow[] = [];
    const endLimit = rec.end_type === 'date' && rec.end_date
      ? new Date(rec.end_date)
      : null;

    if (rec.type === 'interval'
      && rec.interval_value && rec.interval_unit
      && rec.downtime_value != null && rec.downtime_unit) {
      cycles = generateIntervalCycles(
        startDate,
        rec.interval_value,
        rec.interval_unit,
        rec.downtime_value,
        rec.downtime_unit,
        endLimit,
      );
    } else if (rec.type === 'weekdays' && rec.weekdays && rec.weekdays.length > 0) {
      cycles = generateWeekdayCycles(
        startDate,
        rec.weekdays,
        startTime,
        endTime,
        endLimit,
      );
    }

    if (cycles.length === 0) {
      return jsonResponse({ message: 'No new cycles to generate (end date reached or limit hit)', count: 0 });
    }

    // 4. Batch insert jobs
    const timestamp = now();
    const batches: any[] = [];
    const jobIds: string[] = [];

    for (const cycle of cycles) {
      const job_id = generateId();
      jobIds.push(job_id);
      const cycleStart = cycle.start.toISOString();
      const cycleEnd   = cycle.end.toISOString();

      batches.push(db.prepare(`
        INSERT INTO jobs (
          id, customer_id, project_id, status_id, location,
          site_contact_name, site_contact_email, site_contact_phone,
          po_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        job_id, project.customer_id, projectId,
        'Job Booked',
        project.location || null, // Note: Projects might need a location field too, but for now we inherit
        project.site_contact_name || null,
        project.site_contact_email || null,
        project.site_contact_phone || null,
        project.po_number || null,
        timestamp, timestamp
      ));

      batches.push(db.prepare(`
        INSERT INTO job_schedules (id, job_id, start_time, end_time, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(generateId(), job_id, cycleStart, cycleEnd, timestamp));
    }

    if (batches.length > 0) {
      await db.batch(batches);
    }

    return jsonResponse({
      count: cycles.length,
      job_ids: jobIds,
      message: `Successfully generated ${cycles.length} new job cycle${cycles.length !== 1 ? 's' : ''}`,
    }, 201);
  }),
});
