import { getDb, jsonResponse, errorResponse, methodRouter, now, withRole } from '../lib/db';

export const onRequest = methodRouter({
  GET: withRole(['admin'], async (context) => {
    const db = getDb(context);
    const settings = await db.prepare(
      "SELECT * FROM platform_settings WHERE id = 'global'"
    ).first();

    return jsonResponse(settings || { id: 'global', company_name: 'ScheduleLab', primary_color: '#2563eb' });
  }),

  PUT: withRole(['admin'], async (context) => {
    const db = getDb(context);
    const body = await context.request.json() as {
      company_name?: string;
      logo_url?: string;
      primary_color?: string;
      base_url?: string;
      xero_account_code?: string;
    };

    const timestamp = now();

    await db.prepare(`
      INSERT INTO platform_settings (id, company_name, logo_url, primary_color, base_url, xero_account_code, created_at, updated_at)
      VALUES ('global', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        company_name = COALESCE(excluded.company_name, platform_settings.company_name),
        logo_url = COALESCE(excluded.logo_url, platform_settings.logo_url),
        primary_color = COALESCE(excluded.primary_color, platform_settings.primary_color),
        base_url = COALESCE(excluded.base_url, platform_settings.base_url),
        xero_account_code = excluded.xero_account_code,
        updated_at = excluded.updated_at
    `).bind(
      body.company_name ?? 'ScheduleLab',
      body.logo_url ?? null,
      body.primary_color ?? '#2563eb',
      body.base_url ?? null,
      body.xero_account_code ?? null,
      timestamp, timestamp
    ).run();

    return jsonResponse({ id: 'global' });
  }),
});
