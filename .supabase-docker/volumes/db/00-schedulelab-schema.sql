-- ==================================================
-- ScheduleLab Init Schema
-- Auto-generated on Thu Mar  5 16:59:18 AEDT 2026
-- ==================================================

-- SOURCE FILE: update_schema.sql

-- Add new tracking columns to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS current_machine_hours NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS current_odometer NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS service_interval_type VARCHAR(50) DEFAULT 'hours';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS service_interval_value NUMERIC(15, 2) DEFAULT 250;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS last_service_meter_reading NUMERIC(15, 2) DEFAULT 0;

-- Add new input fields to site_dockets
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS end_machine_hours NUMERIC(15, 2);
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS end_odometer NUMERIC(15, 2);

-- ----------- END OF update_schema.sql ----------- --

-- SOURCE FILE: create_admin.sql

DO $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Only insert if the email does not exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@schedulelab.com') THEN
        
        -- Create the new user and capture their ID
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@schedulelab.com',
            crypt('ScheduleLabAdmin2026!', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO new_user_id;

        -- We DO NOT need to insert into public.user_roles manually because
        -- the trigger `on_auth_user_created` created in `patch_rbac_new2.sql`
        -- will automatically fire and insert the role as 'Administrator'
        -- since they are the first user created!

        RAISE NOTICE 'Admin user created successfully.';
    ELSE
        RAISE NOTICE 'Admin user already exists.';
    END IF;
END $$;

-- ----------- END OF create_admin.sql ----------- --

-- SOURCE FILE: patch_rbac_new.sql

-- Create the ENUM for roles
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'SUPERUSER', 'DISPATCHER', 'OPERATOR');

-- Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'OPERATOR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (so the UI knows who is who)
CREATE POLICY "Anyone can read user roles" ON public.user_roles
    FOR SELECT TO authenticated USING (true);

-- Admins can manage roles
CREATE POLICY "Admins can insert user roles" ON public.user_roles
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN')
    );

CREATE POLICY "Admins can update user roles" ON public.user_roles
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN')
    );

CREATE POLICY "Admins can delete user roles" ON public.user_roles
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN')
    );

-- Helper function to bootstrap the first admin user
CREATE OR REPLACE FUNCTION public.bootstrap_admin(target_email TEXT)
RETURNS void AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (target_user_id, 'ADMIN')
        ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------- END OF patch_rbac_new.sql ----------- --

-- SOURCE FILE: patch_rbac_new2.sql

-- Add Superuser to existing enum (wrapped in PL/pgSQL block to handle if it already exists)
DO $$ BEGIN
    ALTER TYPE public.user_role ADD VALUE 'Superuser';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'Operator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (so the UI knows who is who)
DROP POLICY IF EXISTS "Anyone can read user roles" ON public.user_roles;
CREATE POLICY "Anyone can read user roles" ON public.user_roles
    FOR SELECT TO authenticated USING (true);

-- Admins can manage roles
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles" ON public.user_roles
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'Administrator')
    );

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles" ON public.user_roles
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'Administrator')
    );

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles" ON public.user_roles
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'Administrator')
    );

-- Helper function to bootstrap the first admin user
CREATE OR REPLACE FUNCTION public.bootstrap_admin(target_email TEXT)
RETURNS void AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (target_user_id, 'Administrator')
        ON CONFLICT (user_id) DO UPDATE SET role = 'Administrator';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------- END OF patch_rbac_new2.sql ----------- --

-- SOURCE FILE: patch-assets.sql

ALTER TABLE public.asset_types ADD COLUMN IF NOT EXISTS checklist_questions JSONB DEFAULT '[]'::jsonb;

UPDATE public.asset_types
SET checklist_questions = '["Has the crane/lifting device been project onboarded and had a daily prestart conducted by the operator?", "Has the lifting area been secured for unintended access by pedestrians and/or vehicles?", "Has an appropriate exclusion zone been established around the lift area?", "Has the crane/lifting device been set-up according to the OEM instructions and is suitable for the load being lifted?", "Are the ground conditions hard, level and assessed as safe to lift by the Operator and Dogman/Rigger?", "Crane and load path are clear of powerlines and other overhead obstructions?", "Are all lifting points deemed suitable for the intended load?", "Has all rigging equipment been inspected and deemed suitable for the intended load?", "Have all slings and rigging been protected from damage during the lift?", "Is the travel path for the load and/or crane/lifting device clear from people and obstructions?", "Is there an appropriate method for controlling the load as required? (Tag Lines, Push Poles, etc)", "Are wind/weather conditions suitable for lifting?"]'::jsonb
WHERE name = 'Crane';

NOTIFY pgrst, 'reload schema';

-- ----------- END OF patch-assets.sql ----------- --

-- SOURCE FILE: patch-dockets.sql

ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS pre_start_safety_check JSONB;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS hazards JSONB;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS asset_metrics JSONB;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS job_description_actual TEXT;
ALTER TABLE public.site_dockets ADD COLUMN IF NOT EXISTS signatures JSONB;

-- ----------- END OF patch-dockets.sql ----------- --

-- SOURCE FILE: patch_billing.sql

-- Billing schema updates: Payment Terms, PO Numbers, Docket Line Items

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);

CREATE TABLE IF NOT EXISTS public.docket_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docket_id UUID REFERENCES public.site_dockets(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id),
    personnel_id UUID REFERENCES public.personnel(id),
    description VARCHAR(255) NOT NULL,
    inventory_code VARCHAR(100),
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 1,
    unit_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_taxable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------- END OF patch_billing.sql ----------- --

-- SOURCE FILE: patch_user_management.sql

-- Add User Management fields to personnel table
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS can_login boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_login_date timestamp with time zone;

-- Ensure email uniqueness across active login accounts
CREATE UNIQUE INDEX IF NOT EXISTS personnel_email_idx ON public.personnel (email) WHERE (email IS NOT NULL AND can_login = true);

-- Add comment
COMMENT ON COLUMN public.personnel.auth_id IS 'References the Supabase auth.users system for authentication.';

-- ----------- END OF patch_user_management.sql ----------- --

