import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates an untyped Supabase client for use in the browser
 * Use this when the database schema is not yet deployed
 * or when you need to bypass type checking
 */
export function createUntypedClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
