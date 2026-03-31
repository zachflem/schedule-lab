import { getDb, jsonResponse, errorResponse, now, sendEmail, withRole, type BaseContext } from '../../../lib/db';

/**
 * Send an invitation email to a personnel member.
 */
export const onRequest = withRole(['admin', 'dispatcher'], async (context: BaseContext) => {
  if (context.request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const id = context.params.id as string;
  const db = getDb(context);
  
  // 1. Fetch the person
  const person = await db.prepare('SELECT * FROM personnel WHERE id = ?').bind(id).first();
  if (!person) {
    return errorResponse('Personnel not found', 404);
  }

  const email = (person as any).email;
  const name = (person as any).name;

  if (!email) {
    return errorResponse('This person does not have an email address configured', 400);
  }

  // 2. Generate Invite Content
  const appUrl = new URL(context.request.url).origin;
  const subject = `Welcome to ScheduleLab, ${name}!`;
  
  const content = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">Welcome to ScheduleLab</h2>
      <p>Hi ${name},</p>
      <p>You've been added to the ScheduleLab platform for <strong>Fleming Crane Hire</strong>.</p>
      <p>You can now log in to manage your schedule, view dockets, and update your qualifications.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${appUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Go to ScheduleLab
        </a>
      </div>
      
      <p style="color: #4b5563; font-size: 14px;">
        <strong>How to login:</strong> Simply click the button above and enter your email address (${email}). You will receive a secure one-time passcode to your inbox.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This is an automated message from ScheduleLab. Please do not reply.
      </p>
    </div>
  `;

  // 3. Send the email
  const result = await sendEmail({
    to: email,
    subject,
    content,
    fromName: 'ScheduleLab Notifications'
  });

  if (!result.success) {
    return errorResponse(`Failed to send email: ${result.error}`, 500);
  }

  // 4. Update Database
  const timestamp = now();
  await db.prepare('UPDATE personnel SET invite_sent_at = ?, updated_at = ? WHERE id = ?')
    .bind(timestamp, timestamp, id)
    .run();

  return jsonResponse({ success: true, sent_at: timestamp });
});
