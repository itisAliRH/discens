import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton client instance for browser
let client: SupabaseClient | null = null;

/**
 * Creates an untyped Supabase client for use in the browser
 * Use this when the database schema is not yet deployed
 * or when you need to bypass type checking
 */
export function createUntypedClient(): SupabaseClient {
  // Return existing client if already created
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, env vars might not be available
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
