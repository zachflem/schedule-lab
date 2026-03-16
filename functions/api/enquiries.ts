import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { EnquirySchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const trashed = url.searchParams.get('trashed');

    let query = `
      SELECT e.*, at.name as asset_type_name
      FROM enquiries e
      LEFT JOIN asset_types at ON e.asset_type_id = at.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) { conditions.push('e.status = ?'); params.push(status); }
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
      INSERT INTO enquiries (id, enquiry_type, customer_name, contact_email, contact_phone,
        job_details, location, preferred_date, project_start_date, project_end_date,
        status, dispatcher_notes, is_trashed, anticipated_hours,
        site_inspection_required, asset_type_id, asset_requirement, po_number,
        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, e.enquiry_type, e.customer_name, e.contact_email, e.contact_phone ?? null,
      e.job_details ?? null, e.location ?? null, e.preferred_date ?? null,
      e.project_start_date ?? null, e.project_end_date ?? null,
      e.status, e.dispatcher_notes ?? null, e.is_trashed ? 1 : 0,
      e.anticipated_hours ?? null, e.site_inspection_required ? 1 : 0,
      e.asset_type_id ?? null, e.asset_requirement ?? null, e.po_number ?? null,
      timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },
});
