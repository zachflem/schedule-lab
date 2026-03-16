import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../lib/db';
import { AssetTypeSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const { results: types } = await db.prepare(
      'SELECT * FROM asset_types ORDER BY name'
    ).all();

    // Fetch extension schemas for each type
    const { results: extSchemas } = await db.prepare(
      'SELECT * FROM asset_type_extension_schemas'
    ).all();

    const schemaMap = new Map(extSchemas.map((s: any) => [s.asset_type_id, JSON.parse(s.schema)]));

    const enriched = types.map((t: any) => ({
      ...t,
      checklist_questions: t.checklist_questions ? JSON.parse(t.checklist_questions) : [],
      extension_schema: schemaMap.get(t.id) || null,
    }));

    return jsonResponse(enriched);
  },

  async POST(context) {
    const db = getDb(context);
    const body = await context.request.json() as {
      name: string;
      checklist_questions?: string[];
      extension_schema?: { key: string; label: string; type: string; required?: boolean; options?: string[] }[];
    };

    if (!body.name) return errorResponse('Name is required', 422);

    const id = generateId();
    const timestamp = now();

    await db.prepare(`
      INSERT INTO asset_types (id, name, checklist_questions, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, body.name, JSON.stringify(body.checklist_questions ?? []), timestamp).run();

    // Create extension schema if provided
    if (body.extension_schema?.length) {
      await db.prepare(`
        INSERT INTO asset_type_extension_schemas (id, asset_type_id, schema, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(generateId(), id, JSON.stringify(body.extension_schema), timestamp, timestamp).run();
    }

    return jsonResponse({ id }, 201);
  },
});
