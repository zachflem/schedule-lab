-- Add payment terms to customers (days net, e.g. 7, 14, 30, 60)
ALTER TABLE customers ADD COLUMN payment_terms_days INTEGER NOT NULL DEFAULT 30;
