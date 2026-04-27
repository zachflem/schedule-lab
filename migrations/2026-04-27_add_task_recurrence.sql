ALTER TABLE tasks ADD COLUMN recurrence_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER;
ALTER TABLE tasks ADD COLUMN recurrence_unit TEXT CHECK(recurrence_unit IN ('hours', 'days', 'weeks', 'months'));
ALTER TABLE tasks ADD COLUMN recurrence_day INTEGER;
