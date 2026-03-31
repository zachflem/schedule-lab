import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now, type BaseContext } from '../lib/db';
import { QualificationSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context: BaseContext) {
    const db = getDb(context);
    const { results } = await db.prepare(
      'SELECT * FROM qualifications ORDER BY name'
    ).all();
    return jsonResponse(results);
  },

  async POST(context: BaseContext) {
    const db = getDb(context);
    const parsed = await parseBody(context.request, QualificationSchema);
    if ('error' in parsed) return parsed.error;
    const p = parsed.data;

    const id = generateId();
    await db.prepare(`
      INSERT INTO qualifications (id, name, rate_hourly, rate_after_hours, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      id, 
      p.name, 
      p.rate_hourly || 0, 
      p.rate_after_hours || 0, 
      now()
    ).run();

    return jsonResponse({ id }, 201);
  }
});
