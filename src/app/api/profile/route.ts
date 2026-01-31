import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ProfileUpdate, QuizType, LanguageCode } from '@/types/database';

export const dynamic = 'force-dynamic';

// Get profile
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate and build update object
    const updates: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    };

    // String fields
    if (body.full_name !== undefined) updates.full_name = body.full_name;
    if (body.email !== undefined) updates.email = body.email;
    
    // Language fields
    if (body.target_language !== undefined) {
      if (!['en', 'de'].includes(body.target_language)) {
        return NextResponse.json(
          { error: 'Invalid target language' },
          { status: 400 }
        );
      }
      updates.target_language = body.target_language as LanguageCode;
    }
    
    if (body.native_language !== undefined) {
      if (!['en', 'de'].includes(body.native_language)) {
        return NextResponse.json(
          { error: 'Invalid native language' },
          { status: 400 }
        );
      }
      updates.native_language = body.native_language as LanguageCode;
    }

    if (body.ui_language !== undefined) {
      if (!['en', 'de'].includes(body.ui_language)) {
        return NextResponse.json(
          { error: 'Invalid UI language' },
          { status: 400 }
        );
      }
      updates.ui_language = body.ui_language as LanguageCode;
    }

    // Number fields
    if (body.daily_goal_minutes !== undefined) {
      const minutes = parseInt(body.daily_goal_minutes);
      if (isNaN(minutes) || minutes < 5 || minutes > 120) {
        return NextResponse.json(
          { error: 'Daily goal must be between 5 and 120 minutes' },
          { status: 400 }
        );
      }
      updates.daily_goal_minutes = minutes;
    }

    // Boolean fields
    if (body.notifications_enabled !== undefined) {
      updates.notifications_enabled = Boolean(body.notifications_enabled);
    }

    // Theme
    if (body.theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(body.theme)) {
        return NextResponse.json(
          { error: 'Invalid theme' },
          { status: 400 }
        );
      }
      updates.theme = body.theme as 'light' | 'dark' | 'system';
    }

    // Quiz preferences
    if (body.preferred_quiz_types !== undefined) {
      const validQuizTypes: QuizType[] = [
        'true_false',
        'multiple_choice',
        'fill_blank',
        'video',
        'reading',
        'game',
        'mix',
      ];
      
      if (!Array.isArray(body.preferred_quiz_types) ||
          !body.preferred_quiz_types.every((t: string) => validQuizTypes.includes(t as QuizType))) {
        return NextResponse.json(
          { error: 'Invalid quiz types' },
          { status: 400 }
        );
      }
      updates.preferred_quiz_types = body.preferred_quiz_types as QuizType[];
    }

    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
