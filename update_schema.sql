-- Add new tracking columns to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS current_machine_hours NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS current_odometer NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS service_interval_type VARCHAR(50) DEFAULT 'hours';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS service_interval_value NUMERIC(15, 2) DEFAULT 250;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS last_service_meter_reading NUMERIC(15, 2) DEFAULT 0;

-- Add new input fields to site_dockets
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS end_machine_hours NUMERIC(15, 2);
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS end_odometer NUMERIC(15, 2);
