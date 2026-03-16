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
      UPDATE customers SET name = ?, email = ?, phone = ?, billing_address = ?,
        contact_details = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      c.name, c.email ?? null, c.phone ?? null,
      c.billing_address ?? null, JSON.stringify(c.contact_details ?? null),
      timestamp, id
    ).run();

    return jsonResponse({ id });
  },
});
