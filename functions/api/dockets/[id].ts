import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now, withRole } from '../../lib/db';
import { SiteDocketSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher', 'operator'], async (context, user) => {
    const db = getDb(context);
    const id = context.params.id as string;

    const docket = await db.prepare(`
      SELECT d.*, j.location, j.job_brief, j.asset_requirement,
             c.name as customer_name, c.site_contact_email as customer_email,
             c.site_contact_phone as customer_phone,
             p.name as submitted_by_name,
             d.customer_copy_email
      FROM site_dockets d
      JOIN jobs j ON d.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN personnel p ON d.submitted_by = p.id
      WHERE d.id = ?
    `).bind(id).first<any>();

    if (!docket) return errorResponse('Docket not found', 404);

    // Operators can only access dockets for jobs they are assigned to
    if (user.role === 'operator') {
      const isAssigned = await db.prepare(
        'SELECT 1 FROM job_resources WHERE job_id = ? AND personnel_id = ?'
      ).bind(docket.job_id, user.id).first();
      if (!isAssigned) return errorResponse('Forbidden: You are not assigned to this job', 403);
    }

    // Fetch line items
    const { results: lineItems } = await db.prepare(
      'SELECT * FROM docket_line_items WHERE docket_id = ? ORDER BY created_at'
    ).bind(id).all();

    return jsonResponse({ ...docket, line_items: lineItems });
  }),

  PUT: withRole(['admin', 'dispatcher', 'operator'], async (context, user) => {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare(
      'SELECT is_locked, docket_status, job_id FROM site_dockets WHERE id = ?'
    ).bind(id).first<{ is_locked: number; docket_status: string; job_id: string }>();

    if (!existing) return errorResponse('Docket not found', 404);

    // Validated dockets are permanently locked — no one can edit them
    if (existing.docket_status === 'validated') {
      return errorResponse('This docket has been validated and cannot be modified', 403);
    }

    // Operators can only edit their own assigned jobs
    if (user.role === 'operator') {
      const isAssigned = await db.prepare(
        'SELECT 1 FROM job_resources WHERE job_id = ? AND personnel_id = ?'
      ).bind(existing.job_id, user.id).first();
      if (!isAssigned) return errorResponse('Forbidden: You are not assigned to this job', 403);
    }

    const parsed = await parseBody(context.request, SiteDocketSchema);
    if ('error' in parsed) return parsed.error;

    const d = parsed.data;
    const timestamp = now();

    // Determine new docket_status:
    // - Operator resubmitting an incomplete docket → 'completed', clear dispatcher_notes
    // - Operator saving draft → 'draft'
    // - Operator submitting (locking) → 'completed'
    // - Dispatcher editing (never locks via PUT, uses /validate endpoint) → keep current or 'completed'
    let newDocketStatus = existing.docket_status;
    let clearDispatcherNotes = false;

    if (user.role === 'operator' || user.role === 'admin') {
      if (d.is_locked) {
        newDocketStatus = 'completed';
        if (existing.docket_status === 'incomplete') clearDispatcherNotes = true;
      } else {
        newDocketStatus = 'draft';
      }
    } else if (user.role === 'dispatcher') {
      // Dispatcher can freely edit but doesn't change status via PUT
      // Status transitions happen via /validate and /reject endpoints
      if (d.is_locked && existing.docket_status !== 'validated') {
        newDocketStatus = 'completed';
      }
    }

    await db.prepare(`
      UPDATE site_dockets SET
        date = ?, time_leave_yard = ?, time_arrive_site = ?, time_leave_site = ?,
        time_return_yard = ?, operator_hours = ?, machine_hours = ?,
        break_duration_minutes = ?, pre_start_safety_check = ?, hazards = ?,
        asset_metrics = ?, job_description_actual = ?, signatures = ?,
        is_locked = ?, locked_at = ?, locked_by = ?,
        docket_status = ?,
        ${clearDispatcherNotes ? 'dispatcher_notes = NULL,' : ''}
        submitted_by = COALESCE(submitted_by, ?),
        customer_copy_email = ?,
        end_machine_hours = ?, end_odometer = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      d.date, d.time_leave_yard, d.time_arrive_site ?? null,
      d.time_leave_site ?? null, d.time_return_yard, d.operator_hours, d.machine_hours,
      d.break_duration_minutes, JSON.stringify(d.pre_start_safety_check ?? null),
      JSON.stringify(d.hazards), JSON.stringify(d.asset_metrics),
      d.job_description_actual ?? null, JSON.stringify(d.signatures),
      d.is_locked ? 1 : 0, d.locked_at ?? null, d.locked_by ?? null,
      newDocketStatus,
      user.id,
      d.customer_copy_email ?? null,
      d.end_machine_hours ?? null, d.end_odometer ?? null, timestamp, id
    ).run();

    // Re-sync line items: delete + re-insert
    await db.prepare('DELETE FROM docket_line_items WHERE docket_id = ?').bind(id).run();
    if (d.line_items?.length) {
      const stmts = d.line_items.map(li =>
        db.prepare(`
          INSERT INTO docket_line_items (id, docket_id, asset_id, personnel_id,
            description, inventory_code, quantity, unit_rate, is_taxable, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          li.id || crypto.randomUUID().replace(/-/g, ''), id,
          li.asset_id ?? null, li.personnel_id ?? null,
          li.description, li.inventory_code, li.quantity, li.unit_rate,
          li.is_taxable ? 1 : 0, timestamp
        )
      );
      await db.batch(stmts);
    }

    // Update job status when submitted
    if (d.is_locked && existing.docket_status !== 'completed') {
      await db.prepare(`UPDATE jobs SET status_id = 'Site Docket', updated_at = ? WHERE id = ?`)
        .bind(timestamp, d.job_id).run();
    }

    return jsonResponse({ id });
  }),
});
