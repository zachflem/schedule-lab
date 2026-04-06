import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole, sendEmail, type BaseContext } from '../../../lib/db';
import { type SignatureMetadata } from '../../../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  /**
   * POST /api/dockets/:id/validate
   * Dispatchers/admins lock a completed docket as validated.
   */
  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const id = context.params.id as string;

    const docket = await db.prepare(`
      SELECT d.id, d.docket_status, d.signatures, d.date, 
             j.location, c.name as customer_name
      FROM site_dockets d
      JOIN jobs j ON d.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      WHERE d.id = ?
    `).bind(id).first<any>();
    
    if (!docket) return errorResponse('Docket not found', 404);

    if (docket.docket_status === 'validated') {
      return errorResponse('Docket is already validated', 409);
    }

    if (docket.docket_status === 'uncompleted' || docket.docket_status === 'draft') {
      return errorResponse('Cannot validate a docket that has not been completed by the operator', 400);
    }

    const timestamp = now();

    await db.prepare(`
      UPDATE site_dockets
      SET docket_status = 'validated',
          is_locked = 1,
          locked_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(timestamp, timestamp, id).run();

    // Trigger Emails
    const signatures: SignatureMetadata[] = typeof docket.signatures === 'string' 
      ? JSON.parse(docket.signatures) 
      : (docket.signatures || []);

    const emailPromises = signatures
      .filter(sig => sig.email_copy_to && sig.email_copy_to.includes('@'))
      .map(sig => {
        const subject = `Validated Site Docket: ${docket.customer_name} - ${docket.date}`;
        const content = `
          <h2>Site Docket Validated</h2>
          <p>Hi ${sig.signatory_name},</p>
          <p>The site docket for <strong>${docket.customer_name}</strong> at <strong>${docket.location || 'Site'}</strong> on <strong>${docket.date}</strong> has been validated by dispatch.</p>
          <p>This is your copy of the signed docket.</p>
          <hr />
          <p>Thank you for using ScheduleLab.</p>
        `;
        return sendEmail({
          to: sig.email_copy_to!,
          subject,
          content,
        });
      });

    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
    }

    return jsonResponse({ id, docket_status: 'validated', emails_sent: emailPromises.length });
  }),
});
