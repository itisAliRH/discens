-- Diagnostic query that RETURNS results (not just notices)
-- Run this in Supabase SQL Editor to see what's missing

SELECT 
    'handle_new_user function' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT 
    'on_auth_user_created trigger' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT 
    'profiles table' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT 
    'memories table' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'memories'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT 
    'streaks table' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'streaks'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT 
    'materials table' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'materials'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

UNION ALL

SELECT 
    'review_cards table' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'review_cards'
    ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status

ORDER BY status DESC, object_name;
