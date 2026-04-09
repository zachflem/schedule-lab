import { getDb, jsonResponse, errorResponse, withRole } from '../../lib/db';
import { sendTestEmail } from '../../lib/emails';

export const onRequestPost = withRole(['admin'], async (context) => {
  const body = await context.request.json() as { to?: string };

  if (!body.to || typeof body.to !== 'string' || !body.to.includes('@')) {
    return errorResponse('A valid email address is required', 422);
  }

  const db = getDb(context);
  const apiKey = context.env.RESEND_API_KEY;

  const result = await sendTestEmail(db, body.to.trim(), apiKey);

  if (!result.success) {
    return errorResponse(result.error ?? 'Failed to send test email', 500);
  }

  return jsonResponse({ sent: true });
});
