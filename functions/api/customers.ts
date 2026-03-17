import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { CustomerSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const { results } = await db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.status_id IN ('Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted')) as enquiry_jobs,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.status_id IN ('Job Booked', 'Job Scheduled', 'Allocated', 'Site Docket')) as active_jobs,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.status_id IN ('Completed', 'Invoiced')) as closed_jobs
      FROM customers c
      ORDER BY c.name
    `).all();
    return jsonResponse(results);
  },

  async POST(context) {
    const parsed = await parseBody(context.request, CustomerSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const c = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO customers (
        id, name, billing_address, 
        site_contact_name, site_contact_phone, site_contact_email,
        billing_contact_name, billing_contact_phone, billing_contact_email,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, c.name, c.billing_address ?? null,
      c.site_contact_name ?? null, c.site_contact_phone ?? null, c.site_contact_email ?? null,
      c.billing_contact_name ?? null, c.billing_contact_phone ?? null, c.billing_contact_email ?? null,
      timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },

  async PUT(context) {
    const id = context.params.id as string;
    if (!id) return errorResponse('Missing ID', 400);

    const parsed = await parseBody(context.request, CustomerSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const c = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE customers SET 
        name = ?, billing_address = ?,
        site_contact_name = ?, site_contact_phone = ?, site_contact_email = ?,
        billing_contact_name = ?, billing_contact_phone = ?, billing_contact_email = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      c.name, c.billing_address ?? null,
      c.site_contact_name ?? null, c.site_contact_phone ?? null, c.site_contact_email ?? null,
      c.billing_contact_name ?? null, c.billing_contact_phone ?? null, c.billing_contact_email ?? null,
      timestamp, id
    ).run();

    return jsonResponse({ success: true });
  },
});
