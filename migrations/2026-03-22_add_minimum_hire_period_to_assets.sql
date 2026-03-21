-- Migration: Add minimum_hire_period to assets table
ALTER TABLE assets ADD COLUMN minimum_hire_period INTEGER DEFAULT 0;
