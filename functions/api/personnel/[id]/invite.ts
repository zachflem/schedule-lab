import { getDb, jsonResponse, errorResponse, now, sendEmail, withRole, type BaseContext } from '../../../lib/db';

type D1Database = any;

async function getCompanySettings(db: D1Database): Promise<{ company_name: string; base_url: string | null; logo_url: string | null }> {
  const settings = await db.prepare(
    "SELECT company_name, base_url, logo_url FROM platform_settings WHERE id = 'global'"
  ).first() as { company_name: string; base_url: string | null; logo_url: string | null } | null;
  return settings ?? { company_name: 'ScheduleLab', base_url: null, logo_url: null };
}

/**
 * Send an invitation email to a personnel member.
 */
export const onRequest = withRole(['admin', 'dispatcher'], async (context: BaseContext) => {
  if (context.request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const id = context.params.id as string;
  const db = getDb(context);

  const body = await context.request.json().catch(() => ({})) as { message?: string };
  const customMessage = typeof body.message === 'string' ? body.message.trim() : '';

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

  // 2. Load company settings
  const { company_name, base_url, logo_url } = await getCompanySettings(db);
  const appUrl = base_url ?? new URL(context.request.url).origin;

  // 3. Build email
  const subject = `Welcome to ${company_name}, ${name}!`;

  const logoHtml = logo_url
    ? `<img src="${logo_url}" alt="${company_name}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;" />`
    : `<p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company_name}</p>`;

  const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#1e40af;padding:24px 32px;">
            ${logoHtml}
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Field Operations Platform</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Welcome to ${company_name}</h2>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${name}, you've been added to the ${company_name} platform.</p>
            ${customMessage ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:16px;margin:0 0 20px;"><p style="margin:0;color:#166534;font-size:14px;white-space:pre-wrap;">${customMessage}</p></div>` : ''}
            <p style="margin:0 0 20px;color:#374151;font-size:14px;">You can now log in to manage your schedule, view dockets, and update your qualifications.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Go to ${company_name}</a>
            </div>
            <div style="background:#dbeafe;border-left:4px solid #3b82f6;border-radius:6px;padding:16px;margin:16px 0;">
              <p style="margin:0 0 4px;font-weight:700;color:#1e40af;font-size:13px;">HOW TO LOG IN</p>
              <p style="margin:0;color:#1e3a8a;font-size:14px;">Click the button above and enter your email address (<strong>${email}</strong>). You will receive a secure one-time passcode to your inbox.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message from ${company_name}. Please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // 4. Send the email
  const result = await sendEmail({
    to: email,
    subject,
    content,
    fromName: `${company_name} Notifications`,
    apiKey: context.env.RESEND_API_KEY,
  });

  if (!result.success) {
    return errorResponse(`Failed to send email: ${result.error}`, 500);
  }

  // 5. Update Database
  const timestamp = now();
  await db.prepare('UPDATE personnel SET invite_sent_at = ?, updated_at = ? WHERE id = ?')
    .bind(timestamp, timestamp, id)
    .run();

  return jsonResponse({ success: true, sent_at: timestamp });
});
