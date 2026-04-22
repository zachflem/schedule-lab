import { getDb, jsonResponse, errorResponse, parseBody, methodRouter, now, type BaseContext } from '../../lib/db';
import { CorrespondenceTemplateSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async PUT(context: BaseContext) {
    const id = context.params.id;
    const db = getDb(context);
    const parsed = await parseBody(context.request, CorrespondenceTemplateSchema);
    if ('error' in parsed) return parsed.error;
    const p = parsed.data;

    await db.prepare(`
      UPDATE correspondence_templates
      SET name = ?, content = ?, updated_at = ?
      WHERE id = ?
    `).bind(p.name, p.content ?? '', now(), id).run();

    return jsonResponse({ success: true });
  },

  async DELETE(context: BaseContext) {
    const id = context.params.id;
    const db = getDb(context);

    const template = await db.prepare(
      'SELECT is_system FROM correspondence_templates WHERE id = ?'
    ).bind(id).first() as { is_system: number } | null;

    if (!template) return errorResponse('Template not found', 404);
    if (template.is_system) return errorResponse('System templates cannot be deleted', 403);

    await db.prepare('DELETE FROM correspondence_templates WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  },
});
