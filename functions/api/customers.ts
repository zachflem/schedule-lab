import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { CustomerSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const { results } = await db.prepare(
      'SELECT * FROM customers ORDER BY name'
    ).all();
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
      INSERT INTO customers (id, name, email, phone, billing_address, contact_details, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, c.name, c.email ?? null, c.phone ?? null,
      c.billing_address ?? null, JSON.stringify(c.contact_details ?? null),
      timestamp, timestamp
    ).run();

    return jsonResponse({ id }, 201);
  },
});
