-- ============================================
-- Add recurrence scheduling to projects
-- ============================================

-- Recurrence type: none | interval | weekdays
ALTER TABLE projects ADD COLUMN recurrence_type TEXT
  CHECK(recurrence_type IN ('interval', 'weekdays', 'none')) DEFAULT 'none';

-- Interval mode: active work period
ALTER TABLE projects ADD COLUMN recurrence_interval_value INTEGER;
ALTER TABLE projects ADD COLUMN recurrence_interval_unit TEXT
  CHECK(recurrence_interval_unit IN ('hours','days','weeks','months'));

-- Interval mode: downtime gap between cycles
ALTER TABLE projects ADD COLUMN recurrence_downtime_value INTEGER;
ALTER TABLE projects ADD COLUMN recurrence_downtime_unit TEXT
  CHECK(recurrence_downtime_unit IN ('hours','days','weeks','months'));

-- Day-of-week mode: JSON array e.g. '["Mon","Thu"]'
ALTER TABLE projects ADD COLUMN recurrence_weekdays TEXT;

-- End condition
ALTER TABLE projects ADD COLUMN recurrence_end_type TEXT
  CHECK(recurrence_end_type IN ('date','ongoing')) DEFAULT 'ongoing';
ALTER TABLE projects ADD COLUMN recurrence_end_date TEXT; -- YYYY-MM-DD or NULL

-- Default working hours applied to each generated job schedule
ALTER TABLE projects ADD COLUMN default_start_time TEXT; -- HH:MM e.g. '07:00'
ALTER TABLE projects ADD COLUMN default_end_time TEXT;   -- HH:MM e.g. '17:00'
