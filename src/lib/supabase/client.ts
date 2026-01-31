import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { useMemo } from 'react';

// Singleton client instance for browser
let client: SupabaseClient<Database> | null = null;

/**
 * Creates a Supabase client for use in the browser (Client Components)
 * This client is used for authentication and real-time subscriptions
 * Safe to call during SSR - will return null if not in browser
 */
export function createClient(): SupabaseClient<Database> | null {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing client if already created
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, env vars might not be available
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase client: missing environment variables');
    return null;
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}

/**
 * React hook to get Supabase client safely in client components
 * Returns null during SSR, actual client after hydration
 */
export function useSupabase(): SupabaseClient<Database> | null {
  return useMemo(() => createClient(), []);
}
