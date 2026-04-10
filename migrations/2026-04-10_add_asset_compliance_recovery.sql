-- Recovery migration: create asset_compliance table (compliance_types already exists from previous run)
-- If cranesafe_expiry still exists on assets, this also migrates and drops it.

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
