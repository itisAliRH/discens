import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Singleton client instance for browser
let client: SupabaseClient<Database> | null = null;

/**
 * Creates a Supabase client for use in the browser (Client Components)
 * This client is used for authentication and real-time subscriptions
 * Returns null during build time when env vars are not available
 */
export function createClient(): SupabaseClient<Database> {
  // Return existing client if already created
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, env vars might not be available
  // Throw a clear error that can be caught by components
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
    );
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
