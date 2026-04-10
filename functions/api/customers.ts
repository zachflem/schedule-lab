import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now, withRole } from '../lib/db';
import { CustomerSchema, type CustomerContact } from '../../src/shared/validation/schemas';

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
  GET: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const { results } = await db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.status_id IN ('Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted')) as enquiry_jobs,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.status_id IN ('Job Booked', 'Job Scheduled', 'Allocated', 'Site Docket')) as active_jobs,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.status_id IN ('Completed', 'Invoiced')) as closed_jobs,
        (
          SELECT json_group_array(json_object(
            'id', cc.id, 'name', cc.name, 'phone', cc.phone,
            'email', cc.email, 'location', cc.location, 'role', cc.role,
            'sort_order', cc.sort_order
          ))
          FROM (SELECT * FROM customer_contacts WHERE customer_id = c.id ORDER BY sort_order)  cc
        ) as contacts_json
      FROM customers c
      ORDER BY c.name
    `).all();

    const data = (results as any[]).map(({ contacts_json, ...row }) => ({
      ...row,
      contacts: contacts_json ? JSON.parse(contacts_json) : [],
    }));

    return jsonResponse(data);
  }),

  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const parsed = await parseBody(context.request, CustomerSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const c = parsed.data;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO customers (id, name, billing_address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, c.name, c.billing_address ?? null, timestamp, timestamp).run();

    if (c.contacts && c.contacts.length > 0) {
      await saveContacts(db, id, c.contacts);
    }

    return jsonResponse({ id }, 201);
  }),

  PUT: withRole(['admin', 'dispatcher'], async (context) => {
    const id = context.params.id as string;
    if (!id) return errorResponse('Missing ID', 400);

    const parsed = await parseBody(context.request, CustomerSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const c = parsed.data;
    const timestamp = now();

    await db.prepare(`
      UPDATE customers SET name = ?, billing_address = ?, updated_at = ?
      WHERE id = ?
    `).bind(c.name, c.billing_address ?? null, timestamp, id).run();

    await saveContacts(db, id, c.contacts ?? []);

    return jsonResponse({ success: true });
  }),
});
