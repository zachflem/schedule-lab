import { getDb, errorResponse, methodRouter, withRole } from '../../lib/db';

/**
 * POST /api/dockets/export
 * Generates a CSV file for the selected validated dockets.
 * Currently supports Xero invoice import format.
 */
export const onRequest = methodRouter({
  POST: withRole(['admin', 'dispatcher'], async (context) => {
    const db = getDb(context);

    let body: { ids?: string[]; format?: string };
    try {
      body = await context.request.json() as { ids?: string[]; format?: string };
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { ids, format = 'xero' } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('At least one docket ID is required', 400);
    }

    if (ids.length > 200) {
      return errorResponse('Maximum 200 dockets per export', 400);
    }

    // Fetch Xero account code from settings
    const settings = await db.prepare(
      "SELECT xero_account_code FROM platform_settings WHERE id = 'global'"
    ).first<{ xero_account_code: string | null }>();
    const accountCode = settings?.xero_account_code ?? '';

    // Fetch dockets with job + customer details (only validated)
    const placeholders = ids.map(() => '?').join(',');
    const { results: dockets } = await db.prepare(`
      SELECT
        d.id,
        d.date,
        d.docket_status,
        j.po_number,
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
    let csv: string;
    if (format === 'xero') {
      csv = buildXeroCsv(dockets, lineItemsByDocket, accountCode);
    } else {
      return errorResponse(`Unsupported export format: ${format}`, 400);
    }

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dockets-export-xero-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }),
});

// ── Xero invoice import CSV builder ──────────────────────────────────────────

/**
 * Xero invoice import CSV format.
 * Reference: https://central.xero.com/s/article/Import-invoices-or-bills-using-a-CSV-file
 *
 * One row per line item. Repeated header fields (ContactName, InvoiceNumber, etc.)
 * only need to be present on the first row of each invoice but we repeat them for clarity.
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
      // Docket with no line items — create a placeholder row
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
