import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now, withRole, type BaseContext } from '../lib/db';
import { SiteDocketSchema, type SiteDocket } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher', 'operator'], async (context: BaseContext, user: any) => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const jobId = url.searchParams.get('job_id');
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status'); // 'active' | 'completed'

    let query = `
      SELECT d.*, j.location, j.job_brief, j.asset_requirement,
             c.name as customer_name
      FROM site_dockets d
      JOIN jobs j ON d.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (jobId) { conditions.push('d.job_id = ?'); params.push(jobId); }
    if (date) { conditions.push('d.date = ?'); params.push(date); }
    if (status === 'active') { conditions.push('d.is_locked = 0'); }
    if (status === 'completed') { conditions.push('d.is_locked = 1'); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.date DESC, d.created_at DESC';

    const { results } = await db.prepare(query).bind(...params).all();
    return jsonResponse(results);
  }),

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

    await db.prepare(`
      INSERT INTO site_dockets (id, job_id, date, time_leave_yard, time_arrive_site,
        time_leave_site, time_return_yard, operator_hours, machine_hours,
        break_duration_minutes, pre_start_safety_check, hazards, asset_metrics,
        job_description_actual, signatures, is_locked, locked_at, locked_by,
        end_machine_hours, end_odometer, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, d.job_id, d.date, d.time_leave_yard, d.time_arrive_site ?? null,
      d.time_leave_site ?? null, d.time_return_yard, d.operator_hours, d.machine_hours,
      d.break_duration_minutes, JSON.stringify(d.pre_start_safety_check ?? null),
      JSON.stringify(d.hazards), JSON.stringify(d.asset_metrics),
      d.job_description_actual ?? null, JSON.stringify(d.signatures),
      d.is_locked ? 1 : 0, d.locked_at ?? null, d.locked_by ?? null,
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

    // If locked, update job status to Completed
    if (d.is_locked) {
      await db.prepare(`UPDATE jobs SET status_id = 'Completed', updated_at = ? WHERE id = ?`)
        .bind(timestamp, d.job_id).run();
    }

    return jsonResponse({ id }, 201);
  }),
});
