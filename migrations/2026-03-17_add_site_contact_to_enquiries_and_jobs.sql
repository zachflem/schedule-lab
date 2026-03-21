-- Migration: Add site contact fields and rename job_details to job_brief in enquiries
-- Also add site contact fields to jobs table

-- 1. ENQUIRIES Changes
ALTER TABLE enquiries ADD COLUMN site_contact_name TEXT;
-- SQLite doesn't support RENAME COLUMN easily in older versions, but it's fine in D1.
ALTER TABLE enquiries RENAME COLUMN job_details TO job_brief;

-- 2. JOBS Changes
ALTER TABLE jobs ADD COLUMN site_contact_name TEXT;
ALTER TABLE jobs ADD COLUMN site_contact_email TEXT;
ALTER TABLE jobs ADD COLUMN site_contact_phone TEXT;
