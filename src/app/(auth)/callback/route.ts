import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Memory } from '@/types/database';

export const runtime = 'edge';

/**
 * OAuth Callback Route
 * Handles the callback from OAuth providers (Google, Apple)
 * Exchanges the code for a session and redirects to the appropriate page
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // Check if this is a new user that needs onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user has completed onboarding by checking their memory
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .select('summary')
        .eq('user_id', user.id)
        .maybeSingle();

      // If no memory or empty summary, redirect to onboarding
      // Using type assertion since schema might not be deployed yet
      const memoryData = memory as Pick<Memory, 'summary'> | null;
      if (!memoryError && memoryData && memoryData.summary === '') {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }

    // Redirect to the intended destination
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
