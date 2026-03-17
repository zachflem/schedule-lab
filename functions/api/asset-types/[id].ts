import { getDb, jsonResponse, errorResponse, methodRouter, now } from '../../lib/db';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    const type = await db.prepare(
      'SELECT * FROM asset_types WHERE id = ?'
    ).bind(id).first();

    if (!type) return errorResponse('Asset Type not found', 404);

    const extSchema = await db.prepare(
      'SELECT schema FROM asset_type_extension_schemas WHERE asset_type_id = ?'
    ).bind(id).first<{ schema: string }>();

    return jsonResponse({
      ...type,
      checklist_questions: type.checklist_questions ? JSON.parse(type.checklist_questions as string) : [],
      extension_schema: extSchema ? JSON.parse(extSchema.schema) : null,
    });
  },

  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;
    const body = await context.request.json() as any;

    const timestamp = now();

    await db.batch([
      db.prepare(`
        UPDATE asset_types SET name = ?, checklist_questions = ?
        WHERE id = ?
      `).bind(body.name, JSON.stringify(body.checklist_questions ?? []), id),
      ...(body.extension_schema ? [
        db.prepare(`
          INSERT INTO asset_type_extension_schemas (id, asset_type_id, schema, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(asset_type_id) DO UPDATE SET schema = EXCLUDED.schema, updated_at = EXCLUDED.updated_at
        `).bind(id + '_ext', id, JSON.stringify(body.extension_schema), timestamp, timestamp)
      ] : [])
    ]);

    return jsonResponse({ id });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;

    await db.batch([
      db.prepare('DELETE FROM asset_type_extension_schemas WHERE asset_type_id = ?').bind(id),
      db.prepare('DELETE FROM asset_types WHERE id = ?').bind(id),
    ]);

    return jsonResponse({ deleted: true });
  },
});
