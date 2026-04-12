-- Add Xero account code to platform settings for invoice export
ALTER TABLE platform_settings ADD COLUMN xero_account_code TEXT;
