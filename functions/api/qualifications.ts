import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now } from '../lib/db';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const { results } = await db.prepare(
      'SELECT * FROM qualifications ORDER BY name'
    ).all();
    return jsonResponse(results);
  },

  async POST(context) {
    const db = getDb(context);
    const body = await context.request.json() as { name: string; rate_hourly?: number; rate_after_hours?: number };

    if (!body.name) return errorResponse('Name is required', 422);

    const id = generateId();
    await db.prepare(`
      INSERT INTO qualifications (id, name, rate_hourly, rate_after_hours, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, body.name, body.rate_hourly ?? 0, body.rate_after_hours ?? 0, now()).run();

    return jsonResponse({ id }, 201);
  },
});
