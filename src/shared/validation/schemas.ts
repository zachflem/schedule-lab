import { z } from 'zod';

// ── Primitives ──────────────────────────────────────────
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');
const isoTimestamp = z.string().datetime({ message: 'Must be an ISO 8601 timestamp' });

// ── Signature Metadata (Mild Audit Trail) ───────────────
export const SignatureMetadataSchema = z.object({
  signatory_name: z.string().min(1, 'Signatory name is required'),
  signatory_role: z.enum(['Site Representative', 'Operator', 'Customer', 'Other']),
  signature_blob: z.string().min(1, 'Signature data is required'),
  signed_at: isoTimestamp,
  signed_lat: z.number().optional(),
  signed_lng: z.number().optional(),
  signed_by_user_id: z.string().optional(),
  device_info: z.string().optional(),
});
export type SignatureMetadata = z.infer<typeof SignatureMetadataSchema>;

// ── Hazard Entry ────────────────────────────────────────
export const HazardSchema = z.object({
  detail: z.string().min(1, 'Hazard detail is required'),
  control: z.string().min(1, 'Control measure is required'),
});
export type Hazard = z.infer<typeof HazardSchema>;

// ── Document Image (site docs/photos) ───────────────────
export const DocumentImageSchema = z.object({
  id: z.string(),
  data_uri: z.string().min(1, 'Image data is required'),
  label: z.string().optional(),
  captured_at: isoTimestamp,
});
export type DocumentImage = z.infer<typeof DocumentImageSchema>;

// ── Asset Metric (per-asset start/end readings) ────────
export const AssetMetricSchema = z.object({
  asset_id: z.string(),
  asset_name: z.string(),
  asset_type_name: z.string().optional(),
  checklist_questions: z.array(z.string()).optional(),
  start_odometer: z.string().default(''),
  start_engine_lower: z.string().default(''),
  start_engine_upper: z.string().default(''),
  end_odometer: z.string().default(''),
  end_engine_lower: z.string().default(''),
  end_engine_upper: z.string().default(''),
});
export type AssetMetric = z.infer<typeof AssetMetricSchema>;

// ── Pre-Start Safety Check ─────────────────────────────
export const PreStartSafetyCheckSchema = z.object({
  estWeight: z.string().optional(),
  weightUnit: z.enum(['t', 'kg']).default('t'),
  estRadius: z.string().optional(),
  craneCapacity: z.string().optional(),
  capacityPercent: z.number().optional(),
  commMethods: z.array(z.string()).default([]),
  checks: z.record(z.string(), z.string()).default({}),
});
export type PreStartSafetyCheck = z.infer<typeof PreStartSafetyCheckSchema>;

// ── Docket Line Item ───────────────────────────────────
export const DocketLineItemSchema = z.object({
  id: z.string().optional(),
  docket_id: z.string().optional(),
  asset_id: z.string().nullable().optional(),
  personnel_id: z.string().nullable().optional(),
  description: z.string().min(1, 'Description is required'),
  inventory_code: z.string().default('AD-HOC'),
  quantity: z.number().min(0),
  unit_rate: z.number().min(0),
  is_taxable: z.boolean().default(true),
});
export type DocketLineItem = z.infer<typeof DocketLineItemSchema>;

// ── Site Docket (the end-state artefact) ───────────────
export const SiteDocketSchema = z.object({
  id: z.string().optional(),
  job_id: z.string().min(1, 'Job ID is required'),
  date: isoDate,
  time_leave_yard: isoTimestamp,
  time_arrive_site: isoTimestamp.nullable().optional(),
  time_leave_site: isoTimestamp.nullable().optional(),
  time_return_yard: isoTimestamp,
  operator_hours: z.number().default(0),
  machine_hours: z.number().default(0),
  break_duration_minutes: z.number().int().default(0),
  pre_start_safety_check: PreStartSafetyCheckSchema.optional(),
  hazards: z.array(HazardSchema).default([]),
  asset_metrics: z.array(AssetMetricSchema).default([]),
  job_description_actual: z.string().optional(),
  document_images: z.array(DocumentImageSchema).max(6).default([]),
  signatures: z.array(SignatureMetadataSchema).min(1, 'At least one signature is required'),
  is_locked: z.boolean().default(false),
  locked_at: isoTimestamp.nullable().optional(),
  locked_by: z.string().nullable().optional(),
  end_machine_hours: z.number().nullable().optional(),
  end_odometer: z.number().nullable().optional(),
  line_items: z.array(DocketLineItemSchema).optional(),
});
export type SiteDocket = z.infer<typeof SiteDocketSchema>;

// ── Customer ───────────────────────────────────────────
export const CustomerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Customer name is required'),
  billing_address: z.string().optional().nullable(),
  
  // Site Contact
  site_contact_name: z.string().optional().nullable(),
  site_contact_phone: z.string().optional().nullable(),
  site_contact_email: z.string().optional().nullable(),
  
  // Billing Contact
  billing_contact_name: z.string().optional().nullable(),
  billing_contact_phone: z.string().optional().nullable(),
  billing_contact_email: z.string().optional().nullable(),

  // Legacy (can be phased out or used for catch-all)
  contact_details: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional().nullable(),
  
  // Job Summaries (populated via join/subquery in API)
  enquiry_jobs: z.number().optional(),
  active_jobs: z.number().optional(),
  closed_jobs: z.number().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

// ── Qualification ───────────────────────────────────────
export const QualificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Qualification name is required'),
  rate_hourly: z.number().default(0),
  rate_after_hours: z.number().default(0),
  expiry_date: isoDate.optional().nullable(),
});
export type Qualification = z.infer<typeof QualificationSchema>;

// ── Asset Type ─────────────────────────────────────────
export const AssetTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Asset type name is required'),
  checklist_questions: z.array(z.string()).default([]),
});
export type AssetType = z.infer<typeof AssetTypeSchema>;

// ── Asset Type Extension Field Definition ──────────────
export const ExtensionFieldDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});
export type ExtensionFieldDefinition = z.infer<typeof ExtensionFieldDefinitionSchema>;

export const AssetTypeExtensionSchemaSchema = z.object({
  id: z.string().optional(),
  asset_type_id: z.string().min(1),
  schema: z.array(ExtensionFieldDefinitionSchema),
});
export type AssetTypeExtensionSchema = z.infer<typeof AssetTypeExtensionSchemaSchema>;

// ── Asset (Base) ───────────────────────────────────────
export const AssetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Asset name is required'),
  asset_type_id: z.string().min(1, 'Asset type is required'),
  category: z.string().optional().nullable(),
  required_qualification_id: z.string().optional().nullable(),
  rate_hourly: z.number().optional().nullable(),
  rate_after_hours: z.number().optional().nullable(),
  rate_dry_hire: z.number().optional().nullable(),
  required_operators: z.number().int().default(1),
  cranesafe_expiry: isoDate.optional().nullable(),
  rego_expiry: isoDate.optional().nullable(),
  insurance_expiry: isoDate.optional().nullable(),
  current_machine_hours: z.number().default(0),
  current_odometer: z.number().default(0),
  service_interval_type: z.enum(['hours', 'odometer']).default('hours'),
  service_interval_value: z.number().default(250),
  last_service_meter_reading: z.number().default(0),
  minimum_hire_period: z.number().int().min(0).default(0),
});
export type Asset = z.infer<typeof AssetSchema>;

// ── Asset Extension (instance data) ────────────────────
export const AssetExtensionSchema = z.object({
  id: z.string().optional(),
  asset_id: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});
export type AssetExtension = z.infer<typeof AssetExtensionSchema>;

// ── Personnel ──────────────────────────────────────────
export const PersonnelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Personnel name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  can_login: z.boolean().default(false),
  qualifications: z.array(QualificationSchema).optional(),
});
export type Personnel = z.infer<typeof PersonnelSchema>;

// ── Job Status ─────────────────────────────────────────
export const JobStatusEnum = z.enum([
  'Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted',
  'Job Booked', 'Job Scheduled', 'Allocated',
  'Site Docket', 'Completed', 'Invoiced', 'Cancelled',
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export const JOB_STATUS_FLOW = [
  'Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted',
  'Job Booked', 'Job Scheduled', 'Allocated',
  'Site Docket', 'Completed', 'Invoiced',
] as const;

export const JOB_ONLY_STATUSES: JobStatus[] = [
  'Job Booked', 'Job Scheduled', 'Allocated',
  'Site Docket', 'Completed', 'Invoiced',
];

export const ENQUIRY_PAGE_JOB_STATUSES: JobStatus[] = [
  'Enquiry', 'Quote', 'Quote Sent', 'Quote Accepted',
];

export const ENQUIRY_TABLE_STATUSES = [
  'New', 'Reviewed', 'Clarification Requested', 'Converted'
] as const;

// ── Project ────────────────────────────────────────────
export const ProjectStatusEnum = z.enum(['Active', 'On Hold', 'Completed', 'Cancelled']);

export const ProjectSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string().min(1, 'Customer is required'),
  enquiry_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().nullable(),
  status: ProjectStatusEnum.default('Active'),
  start_date: isoDate,
  end_date: isoDate,
  po_number: z.string().optional().nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

// ── Job ────────────────────────────────────────────────
export const JobSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string().min(1, 'Customer is required'),
  project_id: z.string().optional().nullable(),
  enquiry_id: z.string().optional().nullable(),
  status_id: JobStatusEnum.default('Enquiry'),
  job_type: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  site_contact_name: z.string().optional().nullable(),
  site_contact_email: z.string().optional().nullable(),
  site_contact_phone: z.string().optional().nullable(),
  asset_requirement: z.string().optional().nullable(),
  po_number: z.string().optional().nullable(),
  job_brief: z.string().optional().nullable(),
  max_weight: z.number().optional().nullable(),
  hazards: z.string().optional().nullable(),
  site_access: z.string().optional().nullable(),
  pricing: z.number().optional().nullable(),
  tc_accepted: z.boolean().default(false),
  approver_name: z.string().optional().nullable(),
  task_description: z.string().optional().nullable(),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  include_standard_terms: z.boolean().default(true),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
});
export type Job = z.infer<typeof JobSchema>;

// ── Job Resource ───────────────────────────────────────
export const JobResourceSchema = z.object({
  id: z.string().optional(),
  job_id: z.string().min(1),
  resource_type: z.enum(['Asset', 'Personnel']),
  asset_id: z.string().optional().nullable(),
  personnel_id: z.string().optional().nullable(),
  qualification_id: z.string().optional().nullable(),
  rate_type: z.string().optional().nullable(),
  rate_amount: z.number().default(0),
  qty: z.number().default(1),
  total: z.number().default(0),
});
export type JobResource = z.infer<typeof JobResourceSchema>;

// ── Enquiry ────────────────────────────────────────────
export const EnquiryTypeEnum = z.enum(['Job', 'Project']);
export const EnquiryStatusEnum = z.enum(['New', 'Reviewed', 'Clarification Requested', 'Converted']);

export const EnquirySchema = z.object({
  id: z.string().optional(),
  enquiry_type: EnquiryTypeEnum.default('Job'),
  customer_name: z.string().min(1, 'Customer name is required'),
  site_contact_name: z.string().optional().nullable(),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().optional().nullable(),
  job_brief: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  preferred_date: isoDate.optional().nullable(),
  project_start_date: isoDate.optional().nullable(),
  project_end_date: isoDate.optional().nullable(),
  status: EnquiryStatusEnum.default('New'),
  dispatcher_notes: z.string().optional().nullable(),
  is_trashed: z.boolean().default(false),
  anticipated_hours: z.number().optional().nullable(),
  site_inspection_required: z.boolean().default(false),
  asset_type_id: z.string().optional().nullable(),
  asset_requirement: z.string().optional().nullable(),
  po_number: z.string().optional().nullable(),
});
export type Enquiry = z.infer<typeof EnquirySchema>;

// ── Platform Settings ──────────────────────────────────
export const PlatformSettingsSchema = z.object({
  id: z.string().default('global'),
  company_name: z.string().default('ScheduleLab'),
  logo_url: z.string().optional().nullable(),
  primary_color: z.string().default('#2563eb'),
  base_url: z.string().url('Must be a valid URL').optional().nullable(),
});
export type PlatformSettings = z.infer<typeof PlatformSettingsSchema>;
