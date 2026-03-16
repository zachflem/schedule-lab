import { getDb, jsonResponse, errorResponse, methodRouter, now } from '../lib/db';

export const onRequest = methodRouter({
  async GET(context) {
    const db = getDb(context);
    const settings = await db.prepare(
      "SELECT * FROM platform_settings WHERE id = 'global'"
    ).first();

    return jsonResponse(settings || { id: 'global', company_name: 'ScheduleLab', primary_color: '#2563eb' });
  },

  async PUT(context) {
    const db = getDb(context);
    const body = await context.request.json() as {
      company_name?: string;
      logo_url?: string;
      primary_color?: string;
    };

    const timestamp = now();

    await db.prepare(`
      INSERT INTO platform_settings (id, company_name, logo_url, primary_color, created_at, updated_at)
      VALUES ('global', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        company_name = COALESCE(excluded.company_name, platform_settings.company_name),
        logo_url = COALESCE(excluded.logo_url, platform_settings.logo_url),
        primary_color = COALESCE(excluded.primary_color, platform_settings.primary_color),
        updated_at = excluded.updated_at
    `).bind(
      body.company_name ?? 'ScheduleLab',
      body.logo_url ?? null,
      body.primary_color ?? '#2563eb',
      timestamp, timestamp
    ).run();

    return jsonResponse({ id: 'global' });
  },
});
