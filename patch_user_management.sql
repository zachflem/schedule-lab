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
