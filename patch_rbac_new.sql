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
