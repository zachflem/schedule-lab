import { getDb, jsonResponse, errorResponse, getUser, type BaseContext } from '../lib/db';

/**
 * GET /api/dashboard
 * Returns aggregated stats for the dashboard:
 * - Job counts by status group
 * - Recent new enquiries (status = 'New')
 * - Jobs needing attention (status = 'Enquiry', 'Quote', 'Quote Sent')
 */
export const onRequest = async (context: BaseContext): Promise<Response> => {
  const user = await getUser(context);
  if (!user) return errorResponse('Unauthorized', 401);

  const db = getDb(context);

  // Job counts by status
  const { results: jobStatusCounts } = await db.prepare(`
    SELECT status_id, COUNT(*) as count
    FROM jobs
    GROUP BY status_id
  `).all() as { results: { status_id: string; count: number }[] };

  // Enquiry counts by status
  const { results: enquiryStatusCounts } = await db.prepare(`
    SELECT status, COUNT(*) as count
    FROM enquiries
    WHERE is_trashed = 0
    GROUP BY status
  `).all() as { results: { status: string; count: number }[] };

  // Latest 5 new enquiries
  const { results: newEnquiries } = await db.prepare(`
    SELECT id, customer_name, contact_email, job_brief, location, preferred_date,
           enquiry_type, status, created_at
    FROM enquiries
    WHERE status = 'New' AND is_trashed = 0
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  // Jobs scheduled today or next 7 days
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { results: upcomingJobs } = await db.prepare(`
    SELECT j.id, j.status_id, j.location, j.job_brief, c.name as customer_name,
           js.start_time, js.end_time
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN job_schedules js ON j.id = js.job_id
    WHERE j.status_id IN ('Job Scheduled', 'Allocated', 'Job Booked')
      AND DATE(js.start_time) BETWEEN ? AND ?
    ORDER BY js.start_time ASC
    LIMIT 8
  `).bind(today, nextWeek).all();

  // Jobs in active pipeline (Booked or later, not completed)
  const { results: activeJobs } = await db.prepare(`
    SELECT j.id, j.status_id, j.location, j.job_brief, c.name as customer_name, j.updated_at
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    WHERE j.status_id IN ('Job Booked', 'Job Scheduled', 'Allocated', 'Site Docket')
    ORDER BY j.updated_at DESC
    LIMIT 6
  `).all();

  return jsonResponse({
    jobStatusCounts,
    enquiryStatusCounts,
    newEnquiries,
    upcomingJobs,
    activeJobs,
  });
};
