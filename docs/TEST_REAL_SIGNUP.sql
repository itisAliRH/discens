-- Test the trigger by simulating a real signup
-- This will show us the ACTUAL error from the trigger

-- First, let's verify the function exists and its definition
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'handle_new_user';

-- Now test by trying to insert a fake user into auth.users
-- This will trigger the function and show us the real error
-- NOTE: This will create a real user in auth.users, so we'll delete it after

DO $$
DECLARE
    test_email TEXT := 'trigger-test-' || floor(random() * 10000)::text || '@example.com';
    new_user_id UUID;
BEGIN
    -- Try to insert into auth.users (this triggers our function)
    BEGIN
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
            '00000000-0000-0000-0000-000000000000'::uuid,
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            test_email,
            crypt('password123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{}'::jsonb,
            NOW(),
            NOW(),
            encode(gen_random_bytes(32), 'hex'),
            '',
            '',
            ''
        )
        RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'User created successfully with ID: %', new_user_id;
        
        -- Check if profile was created
        IF EXISTS (SELECT 1 FROM profiles WHERE id = new_user_id) THEN
            RAISE NOTICE '✓ Profile was created by trigger';
        ELSE
            RAISE NOTICE '✗ Profile was NOT created by trigger';
        END IF;
        
        -- Check if memory was created  
        IF EXISTS (SELECT 1 FROM memories WHERE user_id = new_user_id) THEN
            RAISE NOTICE '✓ Memory was created by trigger';
        ELSE
            RAISE NOTICE '✗ Memory was NOT created by trigger';
        END IF;
        
        -- Check if streak was created
        IF EXISTS (SELECT 1 FROM streaks WHERE user_id = new_user_id) THEN
            RAISE NOTICE '✓ Streak was created by trigger';
        ELSE
            RAISE NOTICE '✗ Streak was NOT created by trigger';
        END IF;
        
        -- Clean up
        DELETE FROM auth.users WHERE id = new_user_id;
        RAISE NOTICE 'Test user deleted';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during user creation: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
    END;
END $$;
