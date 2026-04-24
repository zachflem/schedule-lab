-- ============================================
-- SCHEDULELAB D1 SCHEMA v2 (SQLite / Cloudflare D1)
-- Reverse-Chain: Docket-First Design
-- ============================================

-- TENANT / PLATFORM
CREATE TABLE IF NOT EXISTS platform_settings (
  id                TEXT PRIMARY KEY DEFAULT 'global',
  company_name      TEXT NOT NULL DEFAULT 'ScheduleLab',
  logo_url          TEXT,
  primary_color     TEXT DEFAULT '#2563eb',
  base_url          TEXT,
  xero_account_code TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id                  TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name                TEXT    NOT NULL,
  billing_address     TEXT,
  payment_terms_days  INTEGER NOT NULL DEFAULT 30,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- CUSTOMER CONTACTS (N contacts per customer)
CREATE TABLE IF NOT EXISTS customer_contacts (
  id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  phone       TEXT    CHECK(phone IS NULL OR length(phone) <= 15),
  email       TEXT,
  location    TEXT    CHECK(location IS NULL OR length(location) <= 64),
  role        TEXT    CHECK(role IS NULL OR role IN ('Project Manager','Site Manager','Site Contact','Billing Contact')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);

-- ASSET TYPES
CREATE TABLE IF NOT EXISTS asset_types (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name                TEXT NOT NULL UNIQUE,
  checklist_questions TEXT,  -- JSON: ["Is PPE worn?", ...]
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ASSET TYPE EXTENSION SCHEMAS (configurable per-type extension definitions)
CREATE TABLE IF NOT EXISTS asset_type_extension_schemas (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  asset_type_id TEXT NOT NULL UNIQUE REFERENCES asset_types(id) ON DELETE CASCADE,
  schema        TEXT NOT NULL,  -- JSON: [{ key, label, type, required?, options? }]
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- COMPLIANCE TYPES
CREATE TABLE IF NOT EXISTS compliance_types (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- QUALIFICATIONS
CREATE TABLE IF NOT EXISTS qualifications (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name             TEXT NOT NULL UNIQUE,
  rate_hourly      REAL DEFAULT 0,
  rate_after_hours REAL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ASSETS (Base — generic fields common to all asset types)
CREATE TABLE IF NOT EXISTS assets (
  id                         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name                       TEXT NOT NULL,
  asset_type_id              TEXT NOT NULL REFERENCES asset_types(id),
  category                   TEXT,
  required_qualification_id  TEXT REFERENCES qualifications(id),
  -- Pricing
  rate_hourly                REAL,
  rate_after_hours           REAL,
  rate_dry_hire              REAL,
  required_operators         INTEGER DEFAULT 1,
  -- Compliance (static)
  rego_expiry                TEXT,
  insurance_expiry           TEXT,
  -- Telemetry
  current_machine_hours      REAL DEFAULT 0,
  current_odometer           REAL DEFAULT 0,
  service_interval_type      TEXT DEFAULT 'hours' CHECK(service_interval_type IN ('hours','odometer')),
  service_interval_value     REAL DEFAULT 250,
  last_service_meter_reading REAL DEFAULT 0,
  asset_number               TEXT,
  minimum_hire_period        INTEGER DEFAULT 0,
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ASSET COMPLIANCE ENTRIES
CREATE TABLE IF NOT EXISTS asset_compliance (
  id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  asset_id           TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  compliance_type_id TEXT NOT NULL REFERENCES compliance_types(id) ON DELETE RESTRICT,
  expiry_date        TEXT NOT NULL,
  document_key       TEXT,
  document_name      TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(asset_id, compliance_type_id)
);

-- ASSET MAINTENANCE ACTIVITIES
CREATE TABLE IF NOT EXISTS asset_maintenance_activities (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  asset_id      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('Scheduled Service','General Repair','Breakdown','Other')),
  type_other    TEXT,
  performed_by  TEXT NOT NULL,
  description   TEXT NOT NULL,
  cost          REAL,
  performed_at  TEXT,
  meter_reading REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS asset_maintenance_photos (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  maintenance_id TEXT NOT NULL REFERENCES asset_maintenance_activities(id) ON DELETE CASCADE,
  file_key       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS asset_maintenance_docs (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  maintenance_id TEXT NOT NULL REFERENCES asset_maintenance_activities(id) ON DELETE CASCADE,
  file_key       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ASSET EXTENSIONS (type-specific data per asset instance)
CREATE TABLE IF NOT EXISTS asset_extensions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  asset_id   TEXT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,  -- JSON: values matching the type's extension schema
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PERSONNEL
CREATE TABLE IF NOT EXISTS personnel (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  can_login       INTEGER DEFAULT 0,
  receives_emails INTEGER DEFAULT 1,
  auth_id         TEXT,
  role            TEXT DEFAULT 'operator',
  last_login_date TEXT,
  invite_sent_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_personnel_email
  ON personnel(email) WHERE email IS NOT NULL AND can_login = 1;

-- PERSONNEL QUALIFICATIONS
CREATE TABLE IF NOT EXISTS personnel_qualifications (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  personnel_id     TEXT NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  qualification_id TEXT NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
  expiry_date      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(personnel_id, qualification_id)
);

-- ENQUIRIES (public intake — can become a Job OR a Project)
CREATE TABLE IF NOT EXISTS enquiries (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  enquiry_type             TEXT NOT NULL DEFAULT 'Job' CHECK(enquiry_type IN ('Job','Project')),
  customer_name            TEXT NOT NULL,
  site_contact_name        TEXT,
  contact_email            TEXT NOT NULL,
  contact_phone            TEXT,
  job_brief                TEXT,
  location                 TEXT,
  -- Single job: preferred_date. Project: start/end range.
  preferred_date           TEXT,
  project_start_date       TEXT,
  project_end_date         TEXT,
  status                   TEXT NOT NULL DEFAULT 'New'
    CHECK(status IN ('New','Reviewed','Clarification Requested','Converted')),
  dispatcher_notes         TEXT,
  is_trashed               INTEGER DEFAULT 0,
  anticipated_hours        REAL,
  site_inspection_required INTEGER DEFAULT 0,
  asset_type_id            TEXT REFERENCES asset_types(id),
  asset_requirement        TEXT,
  po_number                TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PROJECTS (container for multi-job engagements)
CREATE TABLE IF NOT EXISTS projects (
  id                        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id               TEXT NOT NULL REFERENCES customers(id),
  enquiry_id                TEXT REFERENCES enquiries(id),
  name                      TEXT NOT NULL,
  description               TEXT,
  status                    TEXT NOT NULL DEFAULT 'Active'
    CHECK(status IN ('Active','On Hold','Completed','Cancelled')),
  start_date                TEXT NOT NULL,
  end_date                  TEXT NOT NULL,
  po_number                 TEXT,
  
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PROJECT JOB TEMPLATES (Recurring job streams within a project)
CREATE TABLE IF NOT EXISTS project_job_templates (
  id                        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id                TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL, -- e.g. "Crane 1 Roster"
  job_type                  TEXT,
  location                  TEXT,
  asset_requirement         TEXT,
  max_weight                REAL,
  hazards                   TEXT,
  site_access               TEXT,
  task_description          TEXT,
  status                    TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Paused', 'Completed')),
  -- Recurrence scheduling
  recurrence_type           TEXT NOT NULL DEFAULT 'none'
    CHECK(recurrence_type IN ('interval', 'weekdays', 'none')),
  recurrence_interval_value INTEGER,
  recurrence_interval_unit  TEXT,
  recurrence_downtime_value INTEGER,
  recurrence_downtime_unit  TEXT,
  recurrence_weekdays       TEXT, -- JSON array of Mon, Tue, etc.
  recurrence_end_type       TEXT NOT NULL DEFAULT 'ongoing'
    CHECK(recurrence_end_type IN ('date', 'ongoing')),
  recurrence_end_date       TEXT,
  -- Default working hours for generated job schedules (HH:MM)
  default_start_time        TEXT,
  default_end_time          TEXT,
  last_generated_date       TEXT, -- Tracks how far jobs have been generated
  
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

-- JOBS (core entity — standalone or within a project)
CREATE TABLE IF NOT EXISTS jobs (
  id                     TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id            TEXT NOT NULL REFERENCES customers(id),
  project_id             TEXT REFERENCES projects(id),
  enquiry_id             TEXT REFERENCES enquiries(id),
  status_id              TEXT NOT NULL DEFAULT 'Enquiry'
    CHECK(status_id IN ('Enquiry','Quote','Quote Sent','Quote Accepted',
                         'Job Booked','Job Scheduled','Allocated',
                         'Site Docket','Completed','Invoiced','Cancelled')),
  job_type               TEXT,
  location               TEXT,
  site_contact_name      TEXT,
  site_contact_email     TEXT,
  site_contact_phone     TEXT,
  asset_requirement      TEXT,
  po_number              TEXT,
  job_brief              TEXT,
  max_weight             REAL,
  hazards                TEXT,
  site_access            TEXT,
  pricing                REAL,
  tc_accepted            INTEGER DEFAULT 0,
  approver_name          TEXT,
  task_description       TEXT,
  inclusions             TEXT,
  exclusions             TEXT,
  include_standard_terms INTEGER DEFAULT 1,
  estimated_hours        REAL,
  quote_recipient        TEXT CHECK(quote_recipient IS NULL OR quote_recipient IN ('site','billing','both','other')),
  quote_other_email      TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- JOB RESOURCES
CREATE TABLE IF NOT EXISTS job_resources (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id           TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resource_type    TEXT NOT NULL CHECK(resource_type IN ('Asset','Personnel')),
  asset_id         TEXT REFERENCES assets(id),
  personnel_id     TEXT REFERENCES personnel(id),
  qualification_id TEXT REFERENCES qualifications(id),
  rate_type        TEXT,
  rate_amount      REAL DEFAULT 0,
  qty              REAL DEFAULT 1,
  total            REAL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ALLOCATIONS
CREATE TABLE IF NOT EXISTS allocations (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id       TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  asset_id     TEXT REFERENCES assets(id),
  personnel_id TEXT REFERENCES personnel(id),
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- JOB SCHEDULES
CREATE TABLE IF NOT EXISTS job_schedules (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- END-STATE: SITE DOCKETS
-- ============================================

CREATE TABLE IF NOT EXISTS site_dockets (
  id                     TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id                 TEXT NOT NULL REFERENCES jobs(id),
  date                   TEXT NOT NULL,
  -- Yard-to-yard timestamps
  time_leave_yard        TEXT,
  time_arrive_site       TEXT,
  time_leave_site        TEXT,
  time_return_yard       TEXT,
  -- Calculated
  operator_hours         REAL DEFAULT 0,
  machine_hours          REAL DEFAULT 0,
  break_duration_minutes INTEGER DEFAULT 0,
  -- Structured JSON
  pre_start_safety_check TEXT,
  hazards                TEXT,
  asset_metrics          TEXT,
  -- Job completion
  job_description_actual TEXT,
  -- Signatures (audit trail)
  signatures             TEXT,
  -- Record locking
  is_locked              INTEGER DEFAULT 0,
  locked_at              TEXT,
  locked_by              TEXT,
  -- Docket workflow status
  docket_status          TEXT NOT NULL DEFAULT 'uncompleted',
  dispatcher_notes       TEXT,
  submitted_by           TEXT REFERENCES personnel(id),
  -- Telemetry sync
  end_machine_hours      REAL,
  end_odometer           REAL,
  -- Timestamps
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- DOCKET LINE ITEMS
CREATE TABLE IF NOT EXISTS docket_line_items (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  docket_id      TEXT NOT NULL REFERENCES site_dockets(id) ON DELETE CASCADE,
  asset_id       TEXT REFERENCES assets(id),
  personnel_id   TEXT REFERENCES personnel(id),
  description    TEXT NOT NULL,
  inventory_code TEXT NOT NULL DEFAULT 'AD-HOC',
  quantity       REAL NOT NULL DEFAULT 0,
  unit_rate      REAL NOT NULL DEFAULT 0,
  is_taxable     INTEGER DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CORRESPONDENCE TEMPLATES
CREATE TABLE IF NOT EXISTS correspondence_templates (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name       TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  is_system  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Completed')),
  completed_by TEXT REFERENCES personnel(id),
  completed_at TEXT,
  created_by   TEXT REFERENCES personnel(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- TASK ASSIGNMENTS (multiple people per task)
CREATE TABLE IF NOT EXISTS task_assignments (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  personnel_id TEXT NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_id, personnel_id)
);

-- TASK FILES (max 3 per task)
CREATE TABLE IF NOT EXISTS task_files (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_key   TEXT NOT NULL,
  file_name  TEXT NOT NULL,
  file_type  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_customer     ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project      ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status       ON jobs(status_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_project ON project_job_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_dockets_job       ON site_dockets(job_id);
CREATE INDEX IF NOT EXISTS idx_dockets_date      ON site_dockets(date);
CREATE INDEX IF NOT EXISTS idx_dockets_status    ON site_dockets(docket_status);
CREATE INDEX IF NOT EXISTS idx_alloc_job         ON allocations(job_id);
CREATE INDEX IF NOT EXISTS idx_alloc_time        ON allocations(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_job_res_job       ON job_resources(job_id);
CREATE INDEX IF NOT EXISTS idx_line_items_docket ON docket_line_items(docket_id);
CREATE INDEX IF NOT EXISTS idx_assets_type       ON assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset  ON asset_maintenance_activities(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_photos ON asset_maintenance_photos(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_docs   ON asset_maintenance_docs(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status          ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_person ON task_assignments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task       ON task_files(task_id);

-- ============================================
-- MIGRATIONS (run these on existing databases)
-- ============================================
-- ALTER TABLE jobs ADD COLUMN estimated_hours REAL;
-- ALTER TABLE jobs ADD COLUMN quote_recipient TEXT;
-- ALTER TABLE jobs ADD COLUMN quote_other_email TEXT;
