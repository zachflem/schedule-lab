import { getDb, jsonResponse, errorResponse, methodRouter, now } from '../../../lib/db';
import { z } from 'zod';

const ScheduleRequestSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
});

export const onRequest = methodRouter({
  async PUT(context) {
    const db = getDb(context);
    const id = context.params.id as string;
    if (!id) return errorResponse('Missing Job ID', 400);

    const body = await context.request.json() as any;
    const result = ScheduleRequestSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse(result.error.message, 400);
    }

    const { start_time, end_time } = result.data;
    const timestamp = now();

    // 1. Verify Job exists
    const job = await db.prepare('SELECT id FROM jobs WHERE id = ?').bind(id).first();
    if (!job) return errorResponse('Job not found', 404);

    // 2. Update or Insert Schedule
    await db.batch([
      // Upsert into job_schedules (Delete existing for this job, then insert)
      db.prepare('DELETE FROM job_schedules WHERE job_id = ?').bind(id),
      db.prepare(`
        INSERT INTO job_schedules (id, job_id, start_time, end_time, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), id, start_time, end_time, timestamp),
      
      // Update Job Status
      db.prepare('UPDATE jobs SET status_id = ?, updated_at = ? WHERE id = ?')
        .bind('Job Scheduled', timestamp, id)
    ]);

    return jsonResponse({ success: true, start_time, end_time });
  },

  async DELETE(context) {
    const db = getDb(context);
    const id = context.params.id as string;
    if (!id) return errorResponse('Missing Job ID', 400);

    const timestamp = now();

    await db.batch([
      db.prepare('DELETE FROM job_schedules WHERE job_id = ?').bind(id),
      db.prepare('UPDATE jobs SET status_id = ?, updated_at = ? WHERE id = ?')
        .bind('Job Booked', timestamp, id) // Or whatever status it should revert to
    ]);

    return jsonResponse({ deleted: true });
  }
});
