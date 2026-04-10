-- Enforce an enum on customer_contacts.role.
-- SQLite cannot add a CHECK constraint to an existing column via ALTER TABLE,
-- so we recreate the table.

CREATE TABLE customer_contacts_new (
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

INSERT INTO customer_contacts_new SELECT * FROM customer_contacts;

DROP TABLE customer_contacts;

ALTER TABLE customer_contacts_new RENAME TO customer_contacts;

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
