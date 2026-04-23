-- Asset maintenance activity tracking

CREATE TABLE IF NOT EXISTS asset_maintenance_activities (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  asset_id      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('Scheduled Service','General Repair','Breakdown','Other')),
  type_other    TEXT,
  performed_by  TEXT NOT NULL,
  description   TEXT NOT NULL,
  cost          REAL,
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

CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON asset_maintenance_activities(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_photos ON asset_maintenance_photos(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_docs ON asset_maintenance_docs(maintenance_id);
