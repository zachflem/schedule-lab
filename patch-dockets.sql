ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS pre_start_safety_check JSONB;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS hazards JSONB;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS asset_metrics JSONB;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS job_description_actual TEXT;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS signatures JSONB;
