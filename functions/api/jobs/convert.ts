import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now } from '../../lib/db';
import { z } from 'zod';
import { RecurrenceWeekdayEnum, RecurrenceUnitEnum } from '../../../src/shared/validation/schemas';

import { 
  addToDate, 
  toDateStr, 
  combineDateTime, 
  generateIntervalCycles, 
  generateWeekdayCycles,
  CycleWindow
} from '../../lib/recurrence';

// ── Schemas ────────────────────────────────────────────────────────────────

const RecurrenceSchema = z.object({
  type: z.enum(['interval', 'weekdays', 'none']),
  // interval mode
  interval_value: z.number().int().positive().optional().nullable(),
  interval_unit: RecurrenceUnitEnum.optional().nullable(),
  downtime_value: z.number().int().min(0).optional().nullable(),
  downtime_unit: RecurrenceUnitEnum.optional().nullable(),
  // weekday mode
  weekdays: z.array(RecurrenceWeekdayEnum).optional().nullable(),
  // end condition
  end_type: z.enum(['date', 'ongoing']).default('ongoing'),
  end_date: z.string().optional().nullable(),
  // default hours (HH:MM)
  default_start_time: z.string().regex(/^\d{2}:\d{2}$/).default('07:00'),
  default_end_time: z.string().regex(/^\d{2}:\d{2}$/).default('17:00'),
});

const ConversionRequestSchema = z.object({
  enquiry_id: z.string().min(1),
  convert_to: z.enum(['Job', 'Quote']),
  assigned_assets: z.array(z.string()).default([]),
  assigned_personnel: z.array(z.string()).default([]),
  quote_recipient: z.enum(['site', 'billing', 'both']).optional(),
  // Project recurrence (only used when enquiry_type === 'Project')
  recurrence: RecurrenceSchema.optional().nullable(),
});

// (Logic moved to lib/recurrence.ts)

// ── Handler ────────────────────────────────────────────────────────────────

export const onRequest = methodRouter({
  async POST(context) {
    const db = getDb(context);
    const body = await context.request.json() as any;
    const result = ConversionRequestSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.message, 400);
    }

    const { enquiry_id, convert_to, assigned_assets, assigned_personnel, quote_recipient, recurrence } = result.data;

    // 1. Fetch Enquiry
    const enquiry = await db.prepare('SELECT * FROM enquiries WHERE id = ?').bind(enquiry_id).first() as any;
    if (!enquiry) return errorResponse('Enquiry not found', 404);

    // 2. Find or Create Customer
    let customer = await db.prepare('SELECT id FROM customers WHERE name = ?').bind(enquiry.customer_name).first() as any;
    let customer_id = customer?.id;

    if (!customer_id) {
      customer_id = generateId();
      await db.prepare(`
        INSERT INTO customers (id, name, site_contact_name, site_contact_email, site_contact_phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        customer_id, enquiry.customer_name,
        enquiry.site_contact_name, enquiry.contact_email, enquiry.contact_phone,
        now(), now()
      ).run();
    }

    const timestamp = now();

    // ── PROJECT BRANCH ────────────────────────────────────────────────────
    if (enquiry.enquiry_type === 'Project' && convert_to === 'Job') {
      const startDate = enquiry.project_start_date || toDateStr(new Date());
      const endDate = enquiry.project_end_date;

      const rec = recurrence ?? { type: 'none', default_start_time: '07:00', default_end_time: '17:00', end_type: 'ongoing' };
      const startTime = rec.default_start_time ?? '07:00';
      const endTime   = rec.default_end_time   ?? '17:00';

      // 3. Create Project
      const project_id = generateId();
      const projectEndDate = rec.end_type === 'date' && rec.end_date
        ? rec.end_date
        : (endDate || toDateStr(addToDate(new Date(startDate), 12, 'months')));

      const weekdaysJson = rec.weekdays ? JSON.stringify(rec.weekdays) : null;

      await db.prepare(`
        INSERT INTO projects (
          id, customer_id, enquiry_id, name, description,
          status, start_date, end_date, po_number,
          recurrence_type,
          recurrence_interval_value, recurrence_interval_unit,
          recurrence_downtime_value, recurrence_downtime_unit,
          recurrence_weekdays,
          recurrence_end_type, recurrence_end_date,
          default_start_time, default_end_time,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        project_id, customer_id, enquiry_id,
        enquiry.customer_name + ' Project', enquiry.job_brief ?? null,
        'Active', startDate, projectEndDate, enquiry.po_number ?? null,
        rec.type ?? 'none',
        rec.interval_value ?? null, rec.interval_unit ?? null,
        rec.downtime_value ?? null, rec.downtime_unit ?? null,
        weekdaysJson,
        rec.end_type ?? 'ongoing', rec.end_date ?? null,
        startTime, endTime,
        timestamp, timestamp
      ).run();

      // 4. Generate job cycles
      let cycles: CycleWindow[] = [];
      const endLimit = rec.end_type === 'date' && rec.end_date
        ? new Date(rec.end_date)
        : null;

      if (rec.type === 'interval'
        && rec.interval_value && rec.interval_unit
        && rec.downtime_value != null && rec.downtime_unit) {
        cycles = generateIntervalCycles(
          new Date(startDate),
          rec.interval_value,
          rec.interval_unit,
          rec.downtime_value,
          rec.downtime_unit,
          endLimit,
        );
      } else if (rec.type === 'weekdays' && rec.weekdays && rec.weekdays.length > 0) {
        cycles = generateWeekdayCycles(
          new Date(startDate),
          rec.weekdays,
          startTime,
          endTime,
          endLimit,
        );
      } else {
        // 'none' — single job
        cycles = [{
          start: new Date(combineDateTime(startDate, startTime)),
          end:   new Date(combineDateTime(startDate, endTime)),
        }];
      }

      // 5. Insert jobs + schedules + resources for each cycle
      const job_ids: string[] = [];
      const batches: any[] = [];

      for (const cycle of cycles) {
        const job_id = generateId();
        job_ids.push(job_id);
        const cycleStart = cycle.start.toISOString();
        const cycleEnd   = cycle.end.toISOString();

        batches.push(db.prepare(`
          INSERT INTO jobs (
            id, customer_id, project_id, enquiry_id, status_id, location,
            site_contact_name, site_contact_email, site_contact_phone,
            job_brief, asset_requirement, po_number,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          job_id, customer_id, project_id, enquiry_id,
          'Job Booked',
          enquiry.location ?? null,
          enquiry.site_contact_name ?? null,
          enquiry.contact_email ?? null,
          enquiry.contact_phone ?? null,
          enquiry.job_brief ?? null,
          enquiry.asset_requirement ?? null,
          enquiry.po_number ?? null,
          timestamp, timestamp
        ));

        // Schedule entry
        batches.push(db.prepare(`
          INSERT INTO job_schedules (id, job_id, start_time, end_time, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(generateId(), job_id, cycleStart, cycleEnd, timestamp));

        // Asset resources
        for (const asset_id of assigned_assets) {
          batches.push(db.prepare(`
            INSERT INTO job_resources (id, job_id, resource_type, asset_id, created_at)
            VALUES (?, ?, 'Asset', ?, ?)
          `).bind(generateId(), job_id, asset_id, timestamp));
        }

        // Personnel resources
        for (const personnel_id of assigned_personnel) {
          batches.push(db.prepare(`
            INSERT INTO job_resources (id, job_id, resource_type, personnel_id, created_at)
            VALUES (?, ?, 'Personnel', ?, ?)
          `).bind(generateId(), job_id, personnel_id, timestamp));
        }
      }

      // 6. Mark enquiry as Converted
      batches.push(db.prepare('UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?')
        .bind('Converted', timestamp, enquiry_id));

      // Execute all in one batch
      if (batches.length > 0) {
        await db.batch(batches);
      }

      return jsonResponse({
        project_id,
        job_ids,
        cycle_count: cycles.length,
        message: `Project created with ${cycles.length} scheduled job${cycles.length !== 1 ? 's' : ''}`,
      }, 201);
    }

    // ── JOB / QUOTE BRANCH (unchanged behaviour) ──────────────────────────
    const job_id = generateId();
    const status_id = convert_to === 'Quote' ? 'Quote' : 'Job Booked';

    await db.prepare(`
      INSERT INTO jobs (
        id, customer_id, enquiry_id, status_id, location,
        site_contact_name, site_contact_email, site_contact_phone,
        job_brief, asset_requirement, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job_id, customer_id, enquiry_id, status_id, enquiry.location,
      enquiry.site_contact_name, enquiry.contact_email, enquiry.contact_phone,
      enquiry.job_brief, enquiry.asset_requirement, timestamp, timestamp
    ).run();

    const batches: any[] = [];

    for (const asset_id of assigned_assets) {
      batches.push(db.prepare(`
        INSERT INTO job_resources (id, job_id, resource_type, asset_id, created_at)
        VALUES (?, ?, 'Asset', ?, ?)
      `).bind(generateId(), job_id, asset_id, timestamp));
    }

    for (const personnel_id of assigned_personnel) {
      batches.push(db.prepare(`
        INSERT INTO job_resources (id, job_id, resource_type, personnel_id, created_at)
        VALUES (?, ?, 'Personnel', ?, ?)
      `).bind(generateId(), job_id, personnel_id, timestamp));
    }

    batches.push(db.prepare('UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?')
      .bind('Converted', timestamp, enquiry_id));

    if (batches.length > 0) {
      await db.batch(batches);
    }

    return jsonResponse({
      job_id,
      customer_id,
      status: status_id,
      message: `Enquiry successfully converted to ${convert_to}`,
    }, 201);
  }
});
