import { createClient } from '@supabase/supabase-js';
import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import type { LanguageCode, MaterialCategory } from '@/types/database';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface CompleteOnboardingRequest {
  targetLanguage: LanguageCode;
  description?: string;
  selectedCategories: MaterialCategory[];
}

/**
 * POST /api/onboarding/complete
 * Complete onboarding - creates profile/memory if they don't exist (bypasses RLS)
 */
export async function POST(request: Request) {
  try {
    // Get current user from the request (uses normal client to verify auth)
    const supabase = await createUntypedServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CompleteOnboardingRequest = await request.json();
    const { targetLanguage, description, selectedCategories } = body;

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 });
    }

    console.log('[API] Completing onboarding for user:', user.id);

    // Check if profile exists using admin client
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Create profile if it doesn't exist
    if (!existingProfile) {
      console.log('[API] Creating profile for user:', user.id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          target_language: targetLanguage,
          native_language: targetLanguage === 'de' ? 'en' : 'en',
        });

      if (profileError) {
        console.error('[API] Profile creation failed:', profileError);
        return NextResponse.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 });
      }
    } else {
      // Update existing profile
      console.log('[API] Updating profile for user:', user.id);
      await supabaseAdmin
        .from('profiles')
        .update({
          target_language: targetLanguage,
          native_language: targetLanguage === 'de' ? 'en' : 'en',
        })
        .eq('id', user.id);
    }

    // Check if memory exists
    const { data: existingMemory } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const summary = description || `Starting to learn ${targetLanguage === 'de' ? 'German' : 'English'}`;
    const memoryData = {
      summary: summary.slice(0, 1000),
      goals: [`Learn ${targetLanguage === 'de' ? 'German' : 'English'}`],
      top_categories: selectedCategories.length > 0 ? selectedCategories : ['daily_life', 'travel'],
    };

    if (!existingMemory) {
      // Create memory
      console.log('[API] Creating memory for user:', user.id);
      const { error: memoryError } = await supabaseAdmin
        .from('memories')
        .insert({
          user_id: user.id,
          ...memoryData,
        });

      if (memoryError) {
        console.error('[API] Memory creation failed:', memoryError);
        return NextResponse.json({ error: `Memory creation failed: ${memoryError.message}` }, { status: 500 });
      }
    } else {
      // Update existing memory
      console.log('[API] Updating memory for user:', user.id);
      await supabaseAdmin
        .from('memories')
        .update(memoryData)
        .eq('user_id', user.id);
    }

    // Check if streak exists
    const { data: existingStreak } = await supabaseAdmin
      .from('streaks')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingStreak) {
      console.log('[API] Creating streak for user:', user.id);
      await supabaseAdmin
        .from('streaks')
        .insert({ user_id: user.id });
    }

    console.log('[API] Onboarding completed successfully for user:', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Onboarding error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
