import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { CustomerSchema, type CustomerContact } from '../../../src/shared/validation/schemas';

async function saveContacts(db: any, customerId: string, contacts: CustomerContact[]) {
  const statements: any[] = [
    db.prepare('DELETE FROM customer_contacts WHERE customer_id = ?').bind(customerId),
  ];
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    statements.push(
      db.prepare(`
        INSERT INTO customer_contacts (id, customer_id, name, phone, email, location, role, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId(), customerId,
        c.name,
        c.phone || null, c.email || null, c.location || null, c.role || null,
        i, now(), now()
      )
    );
  }
  await db.batch(statements);
}

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
    if (!customer) return errorResponse('Customer not found', 404);

    const { results: contactRows } = await db
      .prepare('SELECT * FROM customer_contacts WHERE customer_id = ? ORDER BY sort_order')
      .bind(id)
      .all();

    return jsonResponse({ ...customer, contacts: contactRows ?? [] });
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
      UPDATE customers SET name = ?, billing_address = ?, updated_at = ?
      WHERE id = ?
    `).bind(c.name, c.billing_address ?? null, timestamp, id).run();

    await saveContacts(db, id, c.contacts ?? []);

    return jsonResponse({ id });
  },
});
