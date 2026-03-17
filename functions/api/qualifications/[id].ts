import { getDb, jsonResponse, errorResponse, parseBody, methodRouter } from '../../lib/db';
import { QualificationSchema } from '../../../src/shared/validation/schemas';

interface Context {
  params: Record<string, string>;
  request: Request;
  env: any;
}

export const onRequest = methodRouter({
  async GET(context: Context) {
    const id = context.params.id;
    const db = getDb(context);
    const qualification = await db.prepare('SELECT * FROM qualifications WHERE id = ?').bind(id).first();
    
    if (!qualification) return errorResponse('Qualification not found', 404);
    return jsonResponse(qualification);
  },

  async PUT(context: Context) {
    const id = context.params.id;
    const db = getDb(context);
    const parsed = await parseBody(context.request, QualificationSchema);
    if ('error' in parsed) return parsed.error;
    const p = parsed.data;

    await db.prepare(`
      UPDATE qualifications 
      SET name = ?, rate_hourly = ?, rate_after_hours = ?
      WHERE id = ?
    `).bind(
      p.name,
      p.rate_hourly,
      p.rate_after_hours,
      id
    ).run();

    return jsonResponse({ success: true });
  },

  async DELETE(context: Context) {
    const id = context.params.id;
    const db = getDb(context);
    await db.prepare('DELETE FROM qualifications WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }
});
