-- Migration 0002: Add docket status fields
-- Run against the D1 database using: wrangler d1 execute <db-name> --file=migrations/0002_docket_status.sql

ALTER TABLE site_dockets ADD COLUMN docket_status TEXT NOT NULL DEFAULT 'uncompleted';
ALTER TABLE site_dockets ADD COLUMN dispatcher_notes TEXT;
ALTER TABLE site_dockets ADD COLUMN submitted_by TEXT REFERENCES personnel(id);

-- Update any existing locked dockets to 'validated' status
UPDATE site_dockets SET docket_status = 'validated' WHERE is_locked = 1;

-- Update any existing draft dockets (have data but not locked) to 'completed' status
-- (safe assumption: anything previously saved was submitted)
UPDATE site_dockets SET docket_status = 'completed'
WHERE is_locked = 0
  AND (time_leave_yard IS NOT NULL OR job_description_actual IS NOT NULL OR signatures IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_dockets_status ON site_dockets(docket_status);
