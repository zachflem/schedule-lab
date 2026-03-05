-- Add Superuser to existing enum (wrapped in PL/pgSQL block to handle if it already exists)
DO $$ BEGIN
    -- Standardizing on Uppercase for roles
    null; 
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

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles" ON public.user_roles
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles" ON public.user_roles
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles" ON public.user_roles
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN')
    );

-- Helper function to bootstrap the first admin user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- If this is the very first user in the system, make them an ADMIN
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'ADMIN');
  ELSE
    -- Otherwise default to OPERATOR
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'OPERATOR');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
