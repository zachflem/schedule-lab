import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { CustomerSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
    if (!customer) return errorResponse('Customer not found', 404);

    return jsonResponse(customer);
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const existing = await db.prepare('SELECT id FROM customers WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Customer not found', 404);

    const parsed = await parseBody(context.request, CustomerSchema);
    if ('error' in parsed) return parsed.error;

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

    return jsonResponse({ id });
  },
});
