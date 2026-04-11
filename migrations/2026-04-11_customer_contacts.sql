-- Add normalised customer_contacts child table supporting N contacts per customer.
-- (The remote DB never had the old flat site/billing contact columns,
--  so no data migration or DROP COLUMN steps are needed.)

CREATE TABLE IF NOT EXISTS customer_contacts (
  id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id TEXT    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  phone       TEXT    CHECK(phone IS NULL OR length(phone) <= 15),
  email       TEXT,
  location    TEXT    CHECK(location IS NULL OR length(location) <= 64),
  role        TEXT    CHECK(role IS NULL OR length(role) <= 64),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
