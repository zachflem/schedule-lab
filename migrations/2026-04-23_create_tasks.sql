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

CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_person ON task_assignments(personnel_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task    ON task_files(task_id);
