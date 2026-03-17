import { getDb, generateId, jsonResponse, parseBody, methodRouter, now } from '../lib/db';
import { QualificationSchema } from '../../src/shared/validation/schemas';

interface Context {
  params: Record<string, string>;
  request: Request;
  env: any;
}

export const onRequest = methodRouter({
  async GET(context: Context) {
    const db = getDb(context);
    const { results } = await db.prepare(
      'SELECT * FROM qualifications ORDER BY name'
    ).all();
    return jsonResponse(results);
  },

  async POST(context: Context) {
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
      p.rate_hourly, 
      p.rate_after_hours, 
      now()
    ).run();

    return jsonResponse({ id }, 201);
  }
});
