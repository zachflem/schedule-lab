import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { SiteDocketSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const docket = await db.prepare(`
      SELECT d.*, j.location, j.job_brief, j.asset_requirement,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM site_dockets d
      JOIN jobs j ON d.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      WHERE d.id = ?
    `).bind(id).first();

    if (!docket) return errorResponse('Docket not found', 404);

    // Fetch line items
    const { results: lineItems } = await db.prepare(
      'SELECT * FROM docket_line_items WHERE docket_id = ? ORDER BY created_at'
    ).bind(id).all();

    return jsonResponse({ ...docket, line_items: lineItems });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    // Check lock
    const existing = await db.prepare('SELECT is_locked FROM site_dockets WHERE id = ?').bind(id).first<{ is_locked: number }>();
    if (!existing) return errorResponse('Docket not found', 404);
    if (existing.is_locked) return errorResponse('Docket is locked and cannot be modified', 403);

    const parsed = await parseBody(context.request, SiteDocketSchema);
    if ('error' in parsed) return parsed.error;

    const d = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE site_dockets SET
        date = ?, time_leave_yard = ?, time_arrive_site = ?, time_leave_site = ?,
        time_return_yard = ?, operator_hours = ?, machine_hours = ?,
        break_duration_minutes = ?, pre_start_safety_check = ?, hazards = ?,
        asset_metrics = ?, job_description_actual = ?, signatures = ?,
        is_locked = ?, locked_at = ?, locked_by = ?,
        end_machine_hours = ?, end_odometer = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      d.date, d.time_leave_yard, d.time_arrive_site ?? null,
      d.time_leave_site ?? null, d.time_return_yard, d.operator_hours, d.machine_hours,
      d.break_duration_minutes, JSON.stringify(d.pre_start_safety_check ?? null),
      JSON.stringify(d.hazards), JSON.stringify(d.asset_metrics),
      d.job_description_actual ?? null, JSON.stringify(d.signatures),
      d.is_locked ? 1 : 0, d.locked_at ?? null, d.locked_by ?? null,
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

    // If just locked, complete the job
    if (d.is_locked) {
      await db.prepare(`UPDATE jobs SET status_id = 'Completed', updated_at = ? WHERE id = ?`)
        .bind(timestamp, d.job_id).run();
    }

    return jsonResponse({ id });
  },
});
