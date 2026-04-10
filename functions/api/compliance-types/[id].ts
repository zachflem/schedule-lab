import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole } from '../../lib/db';
import { ComplianceTypeSchema } from '../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  PUT: withRole(['admin', 'dispatcher'], async (context) => {
    const id = context.params.id as string;
    const db = getDb(context);

    const existing = await db.prepare('SELECT id FROM compliance_types WHERE id = ?').bind(id).first();
    if (!existing) return errorResponse('Compliance type not found', 404);

    const raw = await context.request.json() as unknown;
    const result = ComplianceTypeSchema.safeParse(raw);
    if (!result.success) return errorResponse(result.error.message, 422);

    await db.prepare(
      'UPDATE compliance_types SET name = ? WHERE id = ?'
    ).bind(result.data.name, id).run();

    return jsonResponse({ id });
  }),

  DELETE: withRole(['admin'], async (context) => {
    const id = context.params.id as string;
    const db = getDb(context);

    // Prevent deletion if compliance entries reference this type
    const inUse = await db.prepare(
      'SELECT id FROM asset_compliance WHERE compliance_type_id = ? LIMIT 1'
    ).bind(id).first();
    if (inUse) return errorResponse('Cannot delete: compliance type is in use by one or more assets', 409);

    await db.prepare('DELETE FROM compliance_types WHERE id = ?').bind(id).run();
    return jsonResponse({ deleted: true });
  }),
});
