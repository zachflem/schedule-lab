import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now, withRole, type BaseContext } from '../lib/db';
import { SiteDocketSchema, type SiteDocket } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  /**
   * GET /api/dockets
   *
   * Operator: returns dockets for all jobs they are assigned to,
   *   excluding 'validated'. Sorted by priority: incomplete → draft → uncompleted → completed.
   *   Lazily creates 'uncompleted' stub records for assigned jobs that have no docket yet.
   *
   * Dispatcher/Admin: returns all dockets. Accepts ?status= filter.
   */
  GET: withRole(['admin', 'dispatcher', 'operator'], async (context: BaseContext, user: any) => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const statusFilter = url.searchParams.get('status');
    const jobId = url.searchParams.get('job_id');

    if (user.role === 'operator') {
      // 1. Find all jobs this operator is assigned to
      const { results: assignedJobs } = await db.prepare(`
        SELECT DISTINCT j.id, j.status_id, j.location, j.job_brief, c.name as customer_name,
                        js.start_time as scheduled_start
        FROM job_resources jr
        JOIN jobs j ON jr.job_id = j.id
        JOIN customers c ON j.customer_id = c.id
        LEFT JOIN job_schedules js ON j.id = js.job_id
        WHERE jr.personnel_id = ?
          AND jr.resource_type = 'Personnel'
          AND j.status_id NOT IN ('Cancelled', 'Invoiced')
      `).bind(user.id).all<any>();

      if (!assignedJobs || assignedJobs.length === 0) {
        return jsonResponse([]);
      }

      // 2. Load existing dockets for those jobs
      const jobIds = assignedJobs.map((j: any) => j.id);
      const placeholders = jobIds.map(() => '?').join(',');
      const { results: existingDockets } = await db.prepare(`
        SELECT d.*, j.location, j.job_brief, c.name as customer_name,
               js.start_time as scheduled_start,
               p.name as submitted_by_name
        FROM site_dockets d
        JOIN jobs j ON d.job_id = j.id
        JOIN customers c ON j.customer_id = c.id
        LEFT JOIN job_schedules js ON j.id = js.job_id
        LEFT JOIN personnel p ON d.submitted_by = p.id
        WHERE d.job_id IN (${placeholders})
          AND d.docket_status != 'validated'
      `).bind(...jobIds).all<any>();

      const docketsByJob = new Map<string, any>();
      for (const d of (existingDockets ?? [])) {
        docketsByJob.set(d.job_id, d);
      }

      // 3. Lazily create 'uncompleted' stubs for jobs without a docket
      const timestamp = now();
      const stubsToCreate: any[] = [];
      for (const job of assignedJobs) {
        if (!docketsByJob.has(job.id)) {
          const stubId = generateId();
          stubsToCreate.push({ stubId, jobId: job.id, job });
        }
      }

      if (stubsToCreate.length > 0) {
        const stmts = stubsToCreate.map(({ stubId, jobId }) =>
          db.prepare(`
            INSERT OR IGNORE INTO site_dockets
              (id, job_id, date, docket_status, created_at, updated_at)
            VALUES (?, ?, date('now'), 'uncompleted', ?, ?)
          `).bind(stubId, jobId, timestamp, timestamp)
        );
        await db.batch(stmts);

        // Add stubs to result set
        for (const { stubId, job } of stubsToCreate) {
          docketsByJob.set(job.id, {
            id: stubId,
            job_id: job.id,
            docket_status: 'uncompleted',
            date: new Date().toISOString().split('T')[0],
            customer_name: job.customer_name,
            location: job.location,
            job_brief: job.job_brief,
            scheduled_start: job.scheduled_start,
            dispatcher_notes: null,
            submitted_by: null,
            submitted_by_name: null,
            is_locked: 0,
            created_at: timestamp,
            updated_at: timestamp,
          });
        }
      }

      // 4. Sort: incomplete → draft → uncompleted → completed
      const priorityOrder: Record<string, number> = {
        incomplete: 0,
        draft: 1,
        uncompleted: 2,
        completed: 3,
      };
      const results = Array.from(docketsByJob.values()).sort((a, b) => {
        const pa = priorityOrder[a.docket_status] ?? 99;
        const pb = priorityOrder[b.docket_status] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });

      return jsonResponse(results);
    }

    // ── Dispatcher / Admin view ───────────────────────────────────────────────
    let query = `
      SELECT d.*, j.location, j.job_brief, j.asset_requirement,
             c.name as customer_name,
             p.name as submitted_by_name
      FROM site_dockets d
      JOIN jobs j ON d.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN personnel p ON d.submitted_by = p.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (jobId) { conditions.push('d.job_id = ?'); params.push(jobId); }

    if (statusFilter && statusFilter !== 'all') {
      conditions.push('d.docket_status = ?');
      params.push(statusFilter);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.updated_at DESC';

    const { results } = await db.prepare(query).bind(...params).all();
    return jsonResponse(results);
  }),

  /**
   * POST /api/dockets
   * Creates a new docket. Operators can only create for jobs they are assigned to.
   * is_locked = false → docket_status = 'draft'
   * is_locked = true  → docket_status = 'completed'
   */
  POST: withRole(['admin', 'dispatcher', 'operator'], async (context: BaseContext, user: any) => {
    const parsed = await parseBody(context.request, SiteDocketSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const d = parsed.data as SiteDocket;

    if (user.role === 'operator') {
      const isAssigned = await db.prepare(
        'SELECT 1 FROM job_resources WHERE job_id = ? AND personnel_id = ?'
      ).bind(d.job_id, user.id).first();

      if (!isAssigned) {
        return errorResponse('Forbidden: You are not assigned to this job', 403);
      }
    }

    const id = generateId();
    const timestamp = now();
    const docketStatus = d.is_locked ? 'completed' : 'draft';

    await db.prepare(`
      INSERT INTO site_dockets (id, job_id, date, time_leave_yard, time_arrive_site,
        time_leave_site, time_return_yard, operator_hours, machine_hours,
        break_duration_minutes, pre_start_safety_check, hazards, asset_metrics,
        job_description_actual, signatures, is_locked, locked_at, locked_by,
        docket_status, submitted_by,
        end_machine_hours, end_odometer, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, d.job_id, d.date, d.time_leave_yard, d.time_arrive_site ?? null,
      d.time_leave_site ?? null, d.time_return_yard, d.operator_hours, d.machine_hours,
      d.break_duration_minutes, JSON.stringify(d.pre_start_safety_check ?? null),
      JSON.stringify(d.hazards), JSON.stringify(d.asset_metrics),
      d.job_description_actual ?? null, JSON.stringify(d.signatures),
      d.is_locked ? 1 : 0, d.locked_at ?? null, d.locked_by ?? null,
      docketStatus, user.id,
      d.end_machine_hours ?? null, d.end_odometer ?? null, timestamp, timestamp
    ).run();

    // Insert line items if present
    if (d.line_items?.length) {
      const stmts = d.line_items.map(li =>
        db.prepare(`
          INSERT INTO docket_line_items (id, docket_id, asset_id, personnel_id,
            description, inventory_code, quantity, unit_rate, is_taxable, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          generateId(), id, li.asset_id ?? null, li.personnel_id ?? null,
          li.description, li.inventory_code, li.quantity, li.unit_rate,
          li.is_taxable ? 1 : 0, timestamp
        )
      );
      await db.batch(stmts);
    }

    // If submitted (locked), update job status to Site Docket
    if (d.is_locked) {
      await db.prepare(`UPDATE jobs SET status_id = 'Site Docket', updated_at = ? WHERE id = ?`)
        .bind(timestamp, d.job_id).run();
    }

    return jsonResponse({ id }, 201);
  }),
});
