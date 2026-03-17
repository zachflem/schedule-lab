import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { EnquirySchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const enquiry = await db.prepare(`
      SELECT e.*, at.name as asset_type_name
      FROM enquiries e
      LEFT JOIN asset_types at ON e.asset_type_id = at.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!enquiry) return errorResponse('Enquiry not found', 404);
    return jsonResponse(enquiry);
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM enquiries WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Enquiry not found', 404);

    const parsed = await parseBody(context.request, EnquirySchema);
    if ('error' in parsed) return parsed.error;

    const e = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE enquiries SET 
        enquiry_type = ?, customer_name = ?, site_contact_name = ?, 
        contact_email = ?, contact_phone = ?, job_brief = ?, 
        location = ?, preferred_date = ?, project_start_date = ?, 
        project_end_date = ?, status = ?, dispatcher_notes = ?, 
        is_trashed = ?, anticipated_hours = ?, site_inspection_required = ?, 
        asset_type_id = ?, asset_requirement = ?, po_number = ?, 
        updated_at = ?
      WHERE id = ?
    `).bind(
      e.enquiry_type, e.customer_name, e.site_contact_name ?? null,
      e.contact_email, e.contact_phone ?? null, e.job_brief ?? null,
      e.location ?? null, e.preferred_date ?? null, e.project_start_date ?? null,
      e.project_end_date ?? null, e.status, e.dispatcher_notes ?? null,
      e.is_trashed ? 1 : 0, e.anticipated_hours ?? null, e.site_inspection_required ? 1 : 0,
      e.asset_type_id ?? null, e.asset_requirement ?? null, e.po_number ?? null,
      timestamp, id
    ).run();

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;
    await db.prepare('DELETE FROM enquiries WHERE id = ?').bind(id).run();
    return jsonResponse({ deleted: true });
  },
});
