-- Migration to add Job Templates

-- 1. Create the new project_job_templates table
CREATE TABLE IF NOT EXISTS project_job_templates (
  id                        TEXT PRIMARY KEY,
  project_id                TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  job_type                  TEXT,
  location                  TEXT,
  asset_requirement         TEXT,
  max_weight                REAL,
  hazards                   TEXT,
  site_access               TEXT,
  task_description          TEXT,
  status                    TEXT NOT NULL DEFAULT 'Active',
  recurrence_type           TEXT NOT NULL DEFAULT 'none',
  recurrence_interval_value INTEGER,
  recurrence_interval_unit  TEXT,
  recurrence_downtime_value INTEGER,
  recurrence_downtime_unit  TEXT,
  recurrence_weekdays       TEXT,
  recurrence_end_type       TEXT NOT NULL DEFAULT 'ongoing',
  recurrence_end_date       TEXT,
  default_start_time        TEXT,
  default_end_time          TEXT,
  last_generated_date       TEXT,
  
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_templates_project ON project_job_templates(project_id);

-- Note: We are leaving the old recurrence columns on the projects table as orphaned 
-- to maintain SQLite compatibility on older D1 iterations. They will no longer be used.
