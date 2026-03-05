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
        -- will automatically fire and insert the role as 'ADMIN'
        -- since they are the first user created!

        RAISE NOTICE 'Admin user created successfully.';
    ELSE
        RAISE NOTICE 'Admin user already exists.';
    END IF;
END $$;
