import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { EnquirySchema } from '../../src/shared/validation/schemas';
import { sendNewEnquiryEmail } from '../lib/emails';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const statuses = url.searchParams.getAll('status');
    const trashed = url.searchParams.get('trashed');

    let query = `
      SELECT e.*, at.name as asset_type_name
      FROM enquiries e
      LEFT JOIN asset_types at ON e.asset_type_id = at.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (statuses.length > 0) {
      conditions.push(`e.status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
    if (trashed === 'true') { conditions.push('e.is_trashed = 1'); }
    else if (trashed !== 'all') { conditions.push('e.is_trashed = 0'); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY e.created_at DESC';

    const { results } = await db.prepare(query).bind(...params).all();
    return jsonResponse(results);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, EnquirySchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const e = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO enquiries (id, enquiry_type, customer_name, site_contact_name, contact_email, contact_phone,
        job_brief, location, preferred_date, project_start_date, project_end_date,
        status, dispatcher_notes, is_trashed, anticipated_hours,
        site_inspection_required, asset_type_id, asset_requirement, po_number,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, e.enquiry_type, e.customer_name, e.site_contact_name ?? null, e.contact_email, e.contact_phone ?? null,
      e.job_brief ?? null, e.location ?? null, e.preferred_date ?? null,
      e.project_start_date ?? null, e.project_end_date ?? null,
      e.status, e.dispatcher_notes ?? null, e.is_trashed ? 1 : 0,
      e.anticipated_hours ?? null, e.site_inspection_required ? 1 : 0,
      e.asset_type_id ?? null, e.asset_requirement ?? null, e.po_number ?? null,
      timestamp, timestamp
    ).run();

    try {
      await sendNewEnquiryEmail(db, {
        id,
        enquiry_type: e.enquiry_type as string,
        customer_name: e.customer_name,
        contact_email: e.contact_email,
        contact_phone: e.contact_phone,
        location: e.location,
        job_brief: e.job_brief,
        preferred_date: e.preferred_date,
        asset_requirement: e.asset_requirement,
      }, context.env.RESEND_API_KEY, new URL(context.request.url).origin);
    } catch (err) {
      console.error('[Email] Failed to send new enquiry email:', err);
    }

    return jsonResponse({ id }, 201);
  },

  async PUT(context) {
    const id = context.params.id as string;
    if (!id) return errorResponse('Missing ID', 400);

    const db = getDb(context);
    const body = await context.request.json() as any;
    const timestamp = now();

    const allowedFields = ['status', 'dispatcher_notes', 'is_trashed'];
    const updates: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        params.push(field === 'is_trashed' ? (body[field] ? 1 : 0) : body[field]);
      }
    }

    if (updates.length === 0) return errorResponse('No fields to update', 400);

    updates.push('updated_at = ?');
    params.push(timestamp);
    params.push(id);

    await db.prepare(`
      UPDATE enquiries
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();

    return jsonResponse({ success: true });
  },
});
