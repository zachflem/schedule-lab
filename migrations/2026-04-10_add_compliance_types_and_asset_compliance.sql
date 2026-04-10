-- Compliance types master list
CREATE TABLE IF NOT EXISTS compliance_types (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed CraneSafe so existing data can be migrated
INSERT INTO compliance_types (id, name) VALUES (lower(hex(randomblob(16))), 'CraneSafe');

-- Asset compliance entries junction table
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

-- Migrate existing cranesafe_expiry data into asset_compliance
INSERT INTO asset_compliance (id, asset_id, compliance_type_id, expiry_date, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  a.id,
  ct.id,
  a.cranesafe_expiry,
  datetime('now'),
  datetime('now')
FROM assets a
JOIN compliance_types ct ON ct.name = 'CraneSafe'
WHERE a.cranesafe_expiry IS NOT NULL AND a.cranesafe_expiry != '';

-- Drop the now-migrated column
ALTER TABLE assets DROP COLUMN cranesafe_expiry;
