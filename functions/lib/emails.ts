/**
 * Centralised email notification helpers for ScheduleLab.
 * All templates use a consistent branded HTML style.
 */

import { sendEmail } from './db';

type D1Database = any;

// ── HTML wrapper ─────────────────────────────────────────────────────────────

function emailWrapper(title: string, body: string, companyName = 'ScheduleLab'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:#1e40af;padding:24px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${companyName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Field Operations Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This is an automated message from ${companyName}. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoBox(content: string, color = '#dbeafe', borderColor = '#3b82f6'): string {
  return `<div style="background:${color};border-left:4px solid ${borderColor};border-radius:6px;padding:16px;margin:16px 0;">
    ${content}
  </div>`;
}

function warningBox(content: string): string {
  return infoBox(content, '#fef3c7', '#f59e0b');
}

function dangerBox(content: string): string {
  return infoBox(content, '#fee2e2', '#ef4444');
}

function ctaButton(label: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">${label}</a>
  </div>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getCompanySettings(db: D1Database): Promise<{ company_name: string; base_url: string | null }> {
  const settings = await db.prepare(
    "SELECT company_name, base_url FROM platform_settings WHERE id = 'global'"
  ).first() as { company_name: string; base_url: string | null } | null;
  return settings ?? { company_name: 'ScheduleLab', base_url: null };
}

async function getAssignedPersonnelEmails(db: D1Database, jobId: string): Promise<Array<{ name: string; email: string }>> {
  const { results } = await db.prepare(`
    SELECT DISTINCT p.name, p.email
    FROM job_resources jr
    JOIN personnel p ON jr.personnel_id = p.id
    WHERE jr.job_id = ?
      AND jr.resource_type = 'Personnel'
      AND p.email IS NOT NULL
      AND p.receives_emails = 1
  `).bind(jobId).all() as { results: Array<{ name: string; email: string }> };
  return results ?? [];
}

async function getDispatcherEmails(db: D1Database): Promise<Array<{ name: string; email: string }>> {
  const { results } = await db.prepare(`
    SELECT name, email
    FROM personnel
    WHERE role IN ('dispatcher', 'admin')
      AND email IS NOT NULL
      AND receives_emails = 1
  `).all() as { results: Array<{ name: string; email: string }> };
  return results ?? [];
}

// ── Notification: Docket Sent Back (Incomplete) ──────────────────────────────

export async function sendDocketIncompleteEmail(
  db: D1Database,
  docketId: string,
  notes: string
): Promise<void> {
  const docket = await db.prepare(`
    SELECT d.id, d.date, j.id as job_id, j.location, j.job_brief, c.name as customer_name
    FROM site_dockets d
    JOIN jobs j ON d.job_id = j.id
    JOIN customers c ON j.customer_id = c.id
    WHERE d.id = ?
  `).bind(docketId).first() as ({
    id: string; date: string; job_id: string;
    location: string | null; job_brief: string | null; customer_name: string;
  }) | null;

  if (!docket) return;

  const [recipients, { company_name, base_url }] = await Promise.all([
    getAssignedPersonnelEmails(db, docket.job_id),
    getCompanySettings(db),
  ]);

  if (recipients.length === 0) return;

  const appUrl = base_url ?? 'https://schedule-lab.pages.dev';
  const docketUrl = `${appUrl}/dockets`;

  const subject = `Action Required: Site Docket Needs Revision — ${docket.customer_name}`;

  for (const recipient of recipients) {
    const body = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Docket Revision Required</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${recipient.name}, a docket you submitted has been reviewed and requires your attention.</p>

      ${dangerBox(`
        <p style="margin:0 0 4px;font-weight:700;color:#991b1b;font-size:13px;">DISPATCHER NOTES</p>
        <p style="margin:0;color:#7f1d1d;font-size:14px;">${notes}</p>
      `)}

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:40%;">Customer</td><td style="padding:8px 0;font-weight:600;color:#111827;">${docket.customer_name}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Docket Date</td><td style="padding:8px 0;font-weight:600;color:#111827;">${docket.date}</td></tr>
        ${docket.location ? `<tr><td style="padding:8px 0;color:#6b7280;">Location</td><td style="padding:8px 0;font-weight:600;color:#111827;">${docket.location}</td></tr>` : ''}
      </table>

      ${ctaButton('Review & Update Docket', docketUrl)}
      <p style="text-align:center;font-size:12px;color:#9ca3af;">Please update your docket as soon as possible.</p>
    `;

    await sendEmail({
      to: recipient.email,
      subject,
      content: emailWrapper(subject, body, company_name),
      fromName: company_name,
    });
  }
}

// ── Notification: Job Scheduled ───────────────────────────────────────────────

export async function sendJobScheduledEmail(
  db: D1Database,
  jobId: string
): Promise<void> {
  const job = await db.prepare(`
    SELECT j.id, j.location, j.job_brief, j.site_contact_name, j.site_contact_phone,
           c.name as customer_name, js.start_time, js.end_time
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN job_schedules js ON j.id = js.job_id
    WHERE j.id = ?
  `).bind(jobId).first() as ({
    id: string; location: string | null; job_brief: string | null;
    site_contact_name: string | null; site_contact_phone: string | null;
    customer_name: string; start_time: string | null; end_time: string | null;
  }) | null;

  if (!job) return;

  const [recipients, { company_name, base_url }] = await Promise.all([
    getAssignedPersonnelEmails(db, jobId),
    getCompanySettings(db),
  ]);

  if (recipients.length === 0) return;

  const appUrl = base_url ?? 'https://schedule-lab.pages.dev';
  const docketUrl = `${appUrl}/dockets`;

  const formatDateTime = (iso: string | null): string => {
    if (!iso) return 'TBC';
    try {
      return new Date(iso).toLocaleString('en-AU', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney',
      });
    } catch { return iso; }
  };

  const subject = `Job Scheduled: ${job.customer_name}${job.location ? ` — ${job.location}` : ''}`;

  for (const recipient of recipients) {
    const body = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">You've Been Scheduled for a Job</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${recipient.name}, a job you are assigned to has been scheduled. Please review the details below.</p>

      ${infoBox(`
        <p style="margin:0 0 4px;font-weight:700;color:#1e40af;font-size:13px;">JOB DETAILS</p>
        <table style="width:100%;font-size:14px;margin-top:8px;">
          <tr><td style="color:#1e3a8a;padding:4px 0;width:40%;">Customer</td><td style="font-weight:600;color:#1e3a8a;">${job.customer_name}</td></tr>
          ${job.location ? `<tr><td style="color:#1e3a8a;padding:4px 0;">Location</td><td style="font-weight:600;color:#1e3a8a;">${job.location}</td></tr>` : ''}
          <tr><td style="color:#1e3a8a;padding:4px 0;">Start</td><td style="font-weight:600;color:#1e3a8a;">${formatDateTime(job.start_time)}</td></tr>
          <tr><td style="color:#1e3a8a;padding:4px 0;">Finish</td><td style="font-weight:600;color:#1e3a8a;">${formatDateTime(job.end_time)}</td></tr>
          ${job.site_contact_name ? `<tr><td style="color:#1e3a8a;padding:4px 0;">Site Contact</td><td style="font-weight:600;color:#1e3a8a;">${job.site_contact_name}${job.site_contact_phone ? ` — ${job.site_contact_phone}` : ''}</td></tr>` : ''}
        </table>
      `)}

      ${job.job_brief ? `<div style="margin:16px 0;"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Job Brief</p><p style="margin:0;font-size:14px;color:#374151;">${job.job_brief}</p></div>` : ''}

      ${ctaButton('View My Dockets', docketUrl)}
      <p style="text-align:center;font-size:12px;color:#9ca3af;">Your site docket will be available to fill out from the Dockets page.</p>
    `;

    await sendEmail({
      to: recipient.email,
      subject,
      content: emailWrapper(subject, body, company_name),
      fromName: company_name,
    });
  }
}

// ── Notification: New Public Enquiry ──────────────────────────────────────────

export async function sendNewEnquiryEmail(
  db: D1Database,
  enquiry: {
    id: string;
    enquiry_type: string;
    customer_name: string;
    contact_email: string;
    contact_phone?: string | null;
    location?: string | null;
    job_brief?: string | null;
    preferred_date?: string | null;
    asset_requirement?: string | null;
  }
): Promise<void> {
  const [recipients, { company_name, base_url }] = await Promise.all([
    getDispatcherEmails(db),
    getCompanySettings(db),
  ]);

  if (recipients.length === 0) return;

  const appUrl = base_url ?? 'https://schedule-lab.pages.dev';
  const enquiriesUrl = `${appUrl}/enquiries`;

  const subject = `New ${enquiry.enquiry_type} Enquiry: ${enquiry.customer_name}`;

  for (const recipient of recipients) {
    const body = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">New Enquiry Received</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${recipient.name}, a new ${enquiry.enquiry_type.toLowerCase()} enquiry has been submitted via the public form.</p>

      ${warningBox(`
        <p style="margin:0 0 4px;font-weight:700;color:#92400e;font-size:13px;">ENQUIRY SUMMARY</p>
        <table style="width:100%;font-size:14px;margin-top:8px;">
          <tr><td style="color:#78350f;padding:4px 0;width:40%;">From</td><td style="font-weight:600;color:#78350f;">${enquiry.customer_name}</td></tr>
          <tr><td style="color:#78350f;padding:4px 0;">Email</td><td style="font-weight:600;color:#78350f;">${enquiry.contact_email}</td></tr>
          ${enquiry.contact_phone ? `<tr><td style="color:#78350f;padding:4px 0;">Phone</td><td style="font-weight:600;color:#78350f;">${enquiry.contact_phone}</td></tr>` : ''}
          ${enquiry.location ? `<tr><td style="color:#78350f;padding:4px 0;">Location</td><td style="font-weight:600;color:#78350f;">${enquiry.location}</td></tr>` : ''}
          ${enquiry.preferred_date ? `<tr><td style="color:#78350f;padding:4px 0;">Preferred Date</td><td style="font-weight:600;color:#78350f;">${enquiry.preferred_date}</td></tr>` : ''}
          ${enquiry.asset_requirement ? `<tr><td style="color:#78350f;padding:4px 0;">Asset Required</td><td style="font-weight:600;color:#78350f;">${enquiry.asset_requirement}</td></tr>` : ''}
        </table>
      `)}

      ${enquiry.job_brief ? `<div style="margin:16px 0;"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Job Brief</p><p style="margin:0;font-size:14px;color:#374151;">${enquiry.job_brief}</p></div>` : ''}

      ${ctaButton('View Enquiries', enquiriesUrl)}
    `;

    await sendEmail({
      to: recipient.email,
      subject,
      content: emailWrapper(subject, body, company_name),
      fromName: company_name,
    });
  }
}
