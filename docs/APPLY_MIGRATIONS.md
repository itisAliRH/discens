# Apply Database Migrations to Supabase

## ⚠️ IMPORTANT: Known Issue Fixed

**The trigger in the original migration had a bug.** If you applied migrations before commit `e661979`, you need to run the fix:

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `docs/FIX_TRIGGER_WITH_LOGGING.sql`
3. This fixes the `handle_new_user()` trigger to use explicit schema qualifications

The bug caused "Database error saving new user" during signup because the trigger couldn't find tables in the `public` schema when executing from the `auth` schema.

---

## Quick Steps:

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on your project
3. Go to **SQL Editor** in the left sidebar
4. Click **+ New query**
5. Open the migration file: `supabase/migrations/20260131164050_create_initial_schema.sql`
6. Copy ALL the content (Ctrl+A, Ctrl+C)
7. Paste it into the SQL Editor
8. Click **Run** button
9. Wait for it to complete (should show "Success")
10. Repeat for the second migration: `supabase/migrations/20260131200000_create_conversation_sessions.sql`

### Option 2: Using Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# Link your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to remote database
npx supabase db push

# Verify migrations were applied
npx supabase db remote commit
```

## How to Get Your Project Ref:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Look for "Project URL": `https://YOUR_PROJECT_REF.supabase.co`
5. The `YOUR_PROJECT_REF` is what you need

## After Applying Migrations:

Try creating a new user again. The signup should work!

## Troubleshooting:

- If you see "relation already exists" errors, that's OK - it means some tables were already created
- If you see permission errors, make sure you're using the service role key
- If migrations fail, try running them one at a time
