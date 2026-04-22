import { getDb, generateId, jsonResponse, parseBody, methodRouter, now, type BaseContext } from '../lib/db';
import { CorrespondenceTemplateSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context: BaseContext) {
    const db = getDb(context);
    const { results } = await db.prepare(
      'SELECT * FROM correspondence_templates ORDER BY is_system DESC, name ASC'
    ).all();
    return jsonResponse(results);
  },

  async POST(context: BaseContext) {
    const db = getDb(context);
    const parsed = await parseBody(context.request, CorrespondenceTemplateSchema);
    if ('error' in parsed) return parsed.error;
    const p = parsed.data;

    const id = generateId();
    const timestamp = now();
    await db.prepare(`
      INSERT INTO correspondence_templates (id, name, content, is_system, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).bind(id, p.name, p.content ?? '', timestamp, timestamp).run();

    return jsonResponse({ id }, 201);
  },
});
