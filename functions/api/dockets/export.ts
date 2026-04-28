import { getDb, errorResponse, methodRouter, withRole, now } from '../../lib/db';

/**
 * POST /api/dockets/export
 * Generates a CSV file for the selected validated dockets.
 * Supports 'xero' (Xero invoice import) and 'generic' (configurable column export).
 *
 * Body: { ids: string[], format?: 'xero' | 'generic', sections?: string[], markInvoiced?: boolean }
 *
 * When markInvoiced is true, all exported dockets are transitioned to 'invoiced' status.
 */
export const onRequest = methodRouter({
  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);

    let body: { ids?: string[]; format?: string; sections?: string[]; markInvoiced?: boolean };
    try {
      body = await context.request.json() as typeof body;
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { ids, format = 'xero', sections = ['job_details', 'hours'], markInvoiced = false } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('At least one docket ID is required', 400);
    }

    if (ids.length > 200) {
      return errorResponse('Maximum 200 dockets per export', 400);
    }

    if (format === 'generic' && sections.length === 0) {
      return errorResponse('At least one section must be selected for generic export', 400);
    }

    // Fetch platform settings (Xero account code used by xero format)
    const settings = await db.prepare(
      "SELECT xero_account_code FROM platform_settings WHERE id = 'global'"
    ).first<{ xero_account_code: string | null }>();
    const accountCode = settings?.xero_account_code ?? '';

    // Fetch dockets with all fields needed by either format (only validated)
    const placeholders = ids.map(() => '?').join(',');
    const { results: dockets } = await db.prepare(`
      SELECT
        d.id,
        d.date,
        d.docket_status,
        d.time_leave_yard,
        d.time_arrive_site,
        d.time_leave_site,
        d.time_return_yard,
        d.operator_hours,
        d.machine_hours,
        d.break_duration_minutes,
        d.job_description_actual,
        d.dispatcher_notes,
        j.po_number,
        j.location,
        j.asset_requirement,
        c.name       AS customer_name,
        c.billing_address,
        c.payment_terms_days
      FROM site_dockets d
      JOIN jobs j        ON d.job_id = j.id
      JOIN customers c   ON j.customer_id = c.id
      WHERE d.id IN (${placeholders})
        AND d.docket_status = 'validated'
      ORDER BY d.date ASC
    `).bind(...ids).all<any>();

    if (!dockets || dockets.length === 0) {
      return errorResponse('No validated dockets found for the provided IDs', 404);
    }

    // Fetch line items for these dockets
    const { results: lineItems } = await db.prepare(`
      SELECT
        li.docket_id,
        li.description,
        li.quantity,
        li.unit_rate,
        li.is_taxable,
        li.inventory_code
      FROM docket_line_items li
      WHERE li.docket_id IN (${placeholders})
      ORDER BY li.docket_id, li.rowid
    `).bind(...ids).all<any>();

    const lineItemsByDocket = new Map<string, any[]>();
    for (const li of (lineItems ?? [])) {
      if (!lineItemsByDocket.has(li.docket_id)) {
        lineItemsByDocket.set(li.docket_id, []);
      }
      lineItemsByDocket.get(li.docket_id)!.push(li);
    }

    // Build CSV
    const date = new Date().toISOString().split('T')[0];
    let csv: string;
    let filename: string;

    if (format === 'xero') {
      csv = buildXeroCsv(dockets, lineItemsByDocket, accountCode);
      filename = `dockets-export-xero-${date}.csv`;
    } else if (format === 'generic') {
      csv = buildGenericCsv(dockets, lineItemsByDocket, sections);
      filename = `dockets-export-${date}.csv`;
    } else {
      return errorResponse(`Unsupported export format: ${format}`, 400);
    }

    // Optionally transition all exported dockets to 'invoiced'
    if (markInvoiced && dockets.length > 0) {
      const timestamp = now();
      const updateStmts = dockets.map(d =>
        db.prepare(
          "UPDATE site_dockets SET docket_status = 'invoiced', updated_at = ? WHERE id = ?"
        ).bind(timestamp, d.id)
      );
      await db.batch(updateStmts);
    }

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }),
});

// ── Xero invoice import CSV builder ──────────────────────────────────────────

/**
 * Xero invoice import CSV format.
 * Reference: https://central.xero.com/s/article/Import-invoices-or-bills-using-a-CSV-file
 *
 * One row per line item. Repeated header fields only need to be present on the
 * first row of each invoice but we repeat them for clarity.
 */
function buildXeroCsv(
  dockets: any[],
  lineItemsByDocket: Map<string, any[]>,
  accountCode: string,
): string {
  const HEADERS = [
    'ContactName',
    'InvoiceNumber',
    'InvoiceDate',
    'DueDate',
    'Description',
    'Quantity',
    'UnitAmount',
    'AccountCode',
    'TaxType',
    'Reference',
  ];

  const rows: string[][] = [HEADERS];

  for (const docket of dockets) {
    const items = lineItemsByDocket.get(docket.id) ?? [];
    const dueDate = addDays(docket.date, docket.payment_terms_days ?? 30);
    const invoiceNumber = docket.id.toUpperCase().slice(0, 16);

    if (items.length === 0) {
      rows.push([
        csvEscape(docket.customer_name),
        csvEscape(invoiceNumber),
        docket.date,
        dueDate,
        csvEscape('Services rendered'),
        '1',
        '0.00',
        csvEscape(accountCode),
        'GST on Income',
        csvEscape(docket.po_number ?? ''),
      ]);
    } else {
      for (const li of items) {
        const taxType = li.is_taxable ? 'GST on Income' : 'GST Free Income';
        rows.push([
          csvEscape(docket.customer_name),
          csvEscape(invoiceNumber),
          docket.date,
          dueDate,
          csvEscape(li.description),
          String(li.quantity),
          String(li.unit_rate),
          csvEscape(accountCode),
          taxType,
          csvEscape(docket.po_number ?? ''),
        ]);
      }
    }
  }

  return rows.map(r => r.join(',')).join('\r\n');
}

// ── Generic configurable CSV builder ─────────────────────────────────────────

const SECTION_HEADERS: Record<string, string[]> = {
  job_details:  ['DocketID', 'Date', 'CustomerName', 'Location', 'JobBrief', 'PONumber', 'AssetRequirement'],
  hours:        ['OperatorHours', 'MachineHours', 'BreakMins'],
  site_times:   ['LeaveYard', 'ArriveSite', 'LeaveSite', 'ReturnYard'],
  line_items:   ['LineDescription', 'InventoryCode', 'Quantity', 'UnitRate', 'LineTotal'],
  notes:        ['JobDescription', 'DispatcherNotes'],
};

function buildGenericCsv(
  dockets: any[],
  lineItemsByDocket: Map<string, any[]>,
  sections: string[],
): string {
  const hasLineItems = sections.includes('line_items');

  // Build ordered header from selected sections
  const headers: string[] = [];
  for (const section of ['job_details', 'hours', 'site_times', 'line_items', 'notes']) {
    if (sections.includes(section)) headers.push(...SECTION_HEADERS[section]);
  }

  const rows: string[][] = [headers];

  for (const docket of dockets) {
    // Columns that repeat for every row (docket-level data, excluding line_items and notes)
    const docketCols: string[] = [];

    if (sections.includes('job_details')) {
      docketCols.push(
        csvEscape(docket.id),
        docket.date,
        csvEscape(docket.customer_name),
        csvEscape(docket.location ?? ''),
        csvEscape(docket.job_brief ?? ''),
        csvEscape(docket.po_number ?? ''),
        csvEscape(docket.asset_requirement ?? ''),
      );
    }
    if (sections.includes('hours')) {
      docketCols.push(
        String(docket.operator_hours ?? ''),
        String(docket.machine_hours ?? ''),
        String(docket.break_duration_minutes ?? ''),
      );
    }
    if (sections.includes('site_times')) {
      docketCols.push(
        csvEscape(docket.time_leave_yard ?? ''),
        csvEscape(docket.time_arrive_site ?? ''),
        csvEscape(docket.time_leave_site ?? ''),
        csvEscape(docket.time_return_yard ?? ''),
      );
    }

    const notesCols: string[] = [];
    if (sections.includes('notes')) {
      notesCols.push(
        csvEscape(docket.job_description_actual ?? ''),
        csvEscape(docket.dispatcher_notes ?? ''),
      );
    }

    if (hasLineItems) {
      const items = lineItemsByDocket.get(docket.id) ?? [];
      if (items.length === 0) {
        // Placeholder row with empty line item columns
        rows.push([...docketCols, '', '', '', '', '', ...notesCols]);
      } else {
        for (const li of items) {
          const lineCols = [
            csvEscape(li.description),
            csvEscape(li.inventory_code ?? ''),
            String(li.quantity),
            String(li.unit_rate),
            String((li.quantity * li.unit_rate).toFixed(2)),
          ];
          rows.push([...docketCols, ...lineCols, ...notesCols]);
        }
      }
    } else {
      rows.push([...docketCols, ...notesCols]);
    }
  }

  return rows.map(r => r.join(',')).join('\r\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Add N days to a YYYY-MM-DD date string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/** Escape a CSV field value */
function csvEscape(value: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
