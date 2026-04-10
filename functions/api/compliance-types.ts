import { getDb, generateId, jsonResponse, errorResponse, methodRouter, now, withRole } from '../lib/db';
import { ComplianceTypeSchema } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const { results } = await db.prepare(
      'SELECT * FROM compliance_types ORDER BY name'
    ).all();
    return jsonResponse(results);
  }),

  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const raw = await context.request.json() as unknown;
    const result = ComplianceTypeSchema.safeParse(raw);
    if (!result.success) return errorResponse(result.error.message, 422);

    const db = getDb(context);
    const id = generateId();
    await db.prepare(
      'INSERT INTO compliance_types (id, name, created_at) VALUES (?, ?, ?)'
    ).bind(id, result.data.name, now()).run();

    return jsonResponse({ id }, 201);
  }),
});
