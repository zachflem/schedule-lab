-- Add missing Site Contact columns
ALTER TABLE customers ADD COLUMN site_contact_name TEXT;
ALTER TABLE customers ADD COLUMN site_contact_phone TEXT;
ALTER TABLE customers ADD COLUMN site_contact_email TEXT;

-- Add missing Billing Contact columns
ALTER TABLE customers ADD COLUMN billing_contact_name TEXT;
ALTER TABLE customers ADD COLUMN billing_contact_phone TEXT;
ALTER TABLE customers ADD COLUMN billing_contact_email TEXT;

-- Optional: Remove old columns (if supported)
-- ALTER TABLE customers DROP COLUMN email;
-- ALTER TABLE customers DROP COLUMN phone;
-- ALTER TABLE customers DROP COLUMN contact_details;
