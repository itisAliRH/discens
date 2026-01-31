import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

// Singleton client instance for browser
let client: SupabaseClient | null = null;

/**
 * Creates an untyped Supabase client for use in the browser
 * Use this when the database schema is not yet deployed
 * or when you need to bypass type checking
 * Safe to call during SSR - will return null if not in browser
 */
export function createUntypedClient(): SupabaseClient | null {
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

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

/**
 * React hook to get untyped Supabase client safely in client components
 * Returns null during SSR, actual client after hydration
 */
export function useUntypedSupabase(): SupabaseClient | null {
  return useMemo(() => createUntypedClient(), []);
}
