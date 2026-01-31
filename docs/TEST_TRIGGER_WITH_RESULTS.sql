-- Test the trigger by actually creating a user and checking results
-- This returns data you can see

WITH test_data AS (
    SELECT 
        'trigger-test-' || floor(random() * 10000)::text || '@example.com' as test_email,
        gen_random_uuid() as test_user_id
),
user_insert AS (
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
    )
    SELECT 
        '00000000-0000-0000-0000-000000000000'::uuid,
        test_user_id,
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
    FROM test_data
    RETURNING id, email
),
check_results AS (
    SELECT 
        ui.id as user_id,
        ui.email,
        EXISTS(SELECT 1 FROM profiles WHERE id = ui.id) as profile_created,
        EXISTS(SELECT 1 FROM memories WHERE user_id = ui.id) as memory_created,
        EXISTS(SELECT 1 FROM streaks WHERE user_id = ui.id) as streak_created
    FROM user_insert ui
),
cleanup AS (
    DELETE FROM auth.users 
    WHERE id IN (SELECT user_id FROM check_results)
    RETURNING id
)
SELECT 
    cr.user_id,
    cr.email,
    cr.profile_created,
    cr.memory_created,
    cr.streak_created,
    CASE 
        WHEN cr.profile_created AND cr.memory_created AND cr.streak_created 
        THEN '✓ TRIGGER WORKS!' 
        ELSE '✗ TRIGGER FAILED - see which are false'
    END as status
FROM check_results cr;
