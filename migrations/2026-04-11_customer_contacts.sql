-- Replace flat site/billing contact columns on customers with a
-- normalised customer_contacts child table supporting N contacts per customer.

-- 1. New contacts table
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

-- 2. Migrate existing site/billing contacts into the new table
INSERT INTO customer_contacts (id, customer_id, name, phone, email, role, sort_order, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  id,
  site_contact_name,
  site_contact_phone,
  site_contact_email,
  'Site Contact',
  0,
  created_at,
  updated_at
FROM customers
WHERE site_contact_name IS NOT NULL AND site_contact_name != '';

INSERT INTO customer_contacts (id, customer_id, name, phone, email, role, sort_order, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  id,
  billing_contact_name,
  billing_contact_phone,
  billing_contact_email,
  'Billing Contact',
  1,
  created_at,
  updated_at
FROM customers
WHERE billing_contact_name IS NOT NULL AND billing_contact_name != '';

-- 3. Drop old flat columns
ALTER TABLE customers DROP COLUMN site_contact_name;
ALTER TABLE customers DROP COLUMN site_contact_phone;
ALTER TABLE customers DROP COLUMN site_contact_email;
ALTER TABLE customers DROP COLUMN billing_contact_name;
ALTER TABLE customers DROP COLUMN billing_contact_phone;
ALTER TABLE customers DROP COLUMN billing_contact_email;
