import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now, sendEmail, withRole } from '../lib/db';
import { PersonnelSchema, type Personnel } from '../../src/shared/validation/schemas';

export const onRequest = methodRouter({
  GET: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);
    const { results } = await db.prepare(`
      SELECT p.*, (
        SELECT json_group_array(
          json_object(
            'id', q.id,
            'name', q.name,
            'expiry_date', pq.expiry_date
          )
        )
        FROM personnel_qualifications pq
        JOIN qualifications q ON pq.qualification_id = q.id
        WHERE pq.personnel_id = p.id
      ) as qualifications_json
      FROM personnel p
      ORDER BY p.name
    `).all();

    // Parse JSON string from SQLite
    const formatted = results.map(r => ({
      ...r,
      qualifications: JSON.parse((r as any).qualifications_json || '[]')
    }));

    return jsonResponse(formatted);
  }),

  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const parsed = await parseBody(context.request, PersonnelSchema);
    if ('error' in parsed) return parsed.error;

    const db = getDb(context);
    const id = generateId();
    const p = parsed.data as Personnel;
    const timestamp = now();

    await db.prepare(`
      INSERT INTO personnel (id, name, email, phone, can_login, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, p.name, p.email ?? null, p.phone ?? null,
      p.can_login ? 1 : 0, p.role || 'operator', timestamp, timestamp
    ).run();

    // Handle qualifications if provided
    if (p.qualifications && p.qualifications.length > 0) {
      for (const q of p.qualifications) {
        if (!q.id) continue;
        await db.prepare(`
          INSERT INTO personnel_qualifications (id, personnel_id, qualification_id, expiry_date, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(generateId(), id, q.id, q.expiry_date ?? null, timestamp).run();
      }
    }

    // Automatically send invite if can_login is true and email exists
    if (p.can_login && p.email) {
      try {
        const appUrl = new URL(context.request.url).origin;
        const subject = `Welcome to ScheduleLab, ${p.name}!`;
        const content = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">Welcome to ScheduleLab</h2>
            <p>Hi ${p.name},</p>
            <p>You've been added to the ScheduleLab platform for <strong>Fleming Crane Hire</strong>.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${appUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Go to ScheduleLab
              </a>
            </div>
            <p style="color: #4b5563; font-size: 14px;"><strong>How to login:</strong> Use your email (${p.email}) to receive a secure one-time passcode.</p>
          </div>
        `;
        
        await sendEmail({ to: p.email, subject, content });
        await db.prepare('UPDATE personnel SET invite_sent_at = ? WHERE id = ?').bind(timestamp, id).run();
      } catch (err) {
        console.error('Failed to send auto-invite:', err);
      }
    }

    return jsonResponse({ id }, 201);
  }),
});
