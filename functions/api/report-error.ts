import { getDb, jsonResponse, errorResponse, withRole } from '../lib/db';
import { sendErrorReportEmail } from '../lib/emails';

export const onRequestPost = withRole(['admin', 'dispatcher', 'operator'], async (context, user) => {
  const body = await context.request.json() as { message?: string; url?: string };

  if (!body.message || typeof body.message !== 'string') {
    return errorResponse('message is required', 422);
  }

  const db = getDb(context);
  const apiKey = context.env.RESEND_API_KEY;

  if (!apiKey) {
    return jsonResponse({ sent: false, reason: 'email not configured' });
  }

  const reportedBy = user.name ?? user.email ?? 'Unknown user';
  const pageUrl = body.url ?? 'Not provided';

  await sendErrorReportEmail(db, body.message.trim(), reportedBy, pageUrl, apiKey);

  return jsonResponse({ sent: true });
});
