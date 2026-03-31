-- Migration: Add invite_sent_at to personnel table
ALTER TABLE personnel ADD COLUMN invite_sent_at TEXT;
