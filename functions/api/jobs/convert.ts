import { getDb, generateId, jsonResponse, errorResponse, parseBody, methodRouter, now } from '../../lib/db';
import { JobSchema, JobResourceSchema } from '../../../src/shared/validation/schemas';
import { z } from 'zod';

const ConversionRequestSchema = z.object({
  enquiry_id: z.string().min(1),
  convert_to: z.enum(['Job', 'Quote']),
  assigned_assets: z.array(z.string()).default([]),
  assigned_personnel: z.array(z.string()).default([]),
  quote_recipient: z.enum(['site', 'billing', 'both']).optional(),
});

export const onRequest = methodRouter({
  async POST(context) {
    const db = getDb(context);
    const body = await context.request.json() as any;
    const result = ConversionRequestSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse(result.error.message, 400);
    }

    const { enquiry_id, convert_to, assigned_assets, assigned_personnel, quote_recipient } = result.data;

    // 1. Fetch Enquiry
    const enquiry = await db.prepare('SELECT * FROM enquiries WHERE id = ?').bind(enquiry_id).first() as any;
    if (!enquiry) return errorResponse('Enquiry not found', 404);

    // 2. Find or Create Customer
    let customer = await db.prepare('SELECT id FROM customers WHERE name = ?').bind(enquiry.customer_name).first() as any;
    let customer_id = customer?.id;

    if (!customer_id) {
      customer_id = generateId();
      await db.prepare(`
        INSERT INTO customers (id, name, site_contact_name, site_contact_email, site_contact_phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        customer_id, enquiry.customer_name, 
        enquiry.site_contact_name, enquiry.contact_email, enquiry.contact_phone,
        now(), now()
      ).run();
    }

    // 3. Create Job
    const job_id = generateId();
    const status_id = convert_to === 'Quote' ? 'Quote' : 'Job Booked';
    const timestamp = now();

    await db.prepare(`
      INSERT INTO jobs (
        id, customer_id, enquiry_id, status_id, location, 
        site_contact_name, site_contact_email, site_contact_phone,
        job_brief, asset_requirement, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job_id, customer_id, enquiry_id, status_id, enquiry.location,
      enquiry.site_contact_name, enquiry.contact_email, enquiry.contact_phone,
      enquiry.job_brief, enquiry.asset_requirement, timestamp, timestamp
    ).run();

    // 4. Assign Resources
    const batches: any[] = [];
    
    for (const asset_id of assigned_assets) {
      batches.push(db.prepare(`
        INSERT INTO job_resources (id, job_id, resource_type, asset_id, created_at)
        VALUES (?, ?, 'Asset', ?, ?)
      `).bind(generateId(), job_id, asset_id, timestamp));
    }

    for (const personnel_id of assigned_personnel) {
      batches.push(db.prepare(`
        INSERT INTO job_resources (id, job_id, resource_type, personnel_id, created_at)
        VALUES (?, ?, 'Personnel', ?, ?)
      `).bind(generateId(), job_id, personnel_id, timestamp));
    }

    // 5. Update Enquiry Status
    batches.push(db.prepare('UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?')
      .bind('Converted', timestamp, enquiry_id));

    if (batches.length > 0) {
      await db.batch(batches);
    }

    return jsonResponse({
      job_id,
      customer_id,
      status: status_id,
      message: `Enquiry successfully converted to ${convert_to}`
    }, 201);
  }
});
