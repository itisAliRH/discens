-- Test the handle_new_user function directly
-- This simulates what happens when a new user signs up
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    RAISE NOTICE 'Testing with user_id: %', test_user_id;
    
    -- Try to create profile
    BEGIN
        INSERT INTO profiles (id, email, full_name)
        VALUES (test_user_id, test_email, 'Test User');
        RAISE NOTICE '✓ Profile created successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Profile creation failed: %', SQLERRM;
    END;
    
    -- Try to create memory
    BEGIN
        INSERT INTO memories (user_id)
        VALUES (test_user_id);
        RAISE NOTICE '✓ Memory created successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Memory creation failed: %', SQLERRM;
    END;
    
    -- Try to create streak
    BEGIN
        INSERT INTO streaks (user_id)
        VALUES (test_user_id);
        RAISE NOTICE '✓ Streak created successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Streak creation failed: %', SQLERRM;
    END;
    
    -- Clean up test data
    DELETE FROM streaks WHERE user_id = test_user_id;
    DELETE FROM memories WHERE user_id = test_user_id;
    DELETE FROM profiles WHERE id = test_user_id;
    
    RAISE NOTICE 'Test completed and cleaned up';
END $$;
