import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * POST /api/gamification/streak
 * Update user's streak on activity
 */
export async function POST() {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current streak data
    const { data: streak, error: streakError } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (streakError) {
      return NextResponse.json({ error: 'Streak not found' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = streak.last_activity_date;

    // Calculate streak
    let newStreak = streak.current_streak;
    let streakStart = streak.streak_start_date;
    
    if (!lastActivity) {
      // First activity ever
      newStreak = 1;
      streakStart = today;
    } else if (lastActivity === today) {
      // Already active today, no change
    } else {
      const lastDate = new Date(lastActivity);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day - extend streak
        newStreak = streak.current_streak + 1;
      } else if (diffDays > 1) {
        // Streak broken - reset
        newStreak = 1;
        streakStart = today;
      }
    }

    // Update streak
    const { data: updatedStreak } = await supabase
      .from('streaks')
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak),
        last_activity_date: today,
        streak_start_date: streakStart,
        total_days_active: lastActivity !== today ? streak.total_days_active + 1 : streak.total_days_active,
      })
      .eq('user_id', user.id)
      .select()
      .single();

    // Update profile last_active_at
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);

    // Check for streak badges
    const streakBadges = await checkStreakBadges(supabase, user.id, newStreak);

    return NextResponse.json({
      streak: updatedStreak,
      newBadges: streakBadges,
      isNewDay: lastActivity !== today,
    });
  } catch (error) {
    console.error('Streak update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function checkStreakBadges(supabase: ReturnType<typeof createUntypedServerClient> extends Promise<infer T> ? T : never, userId: string, streak: number) {
  const earnedBadges: Array<{ name: string; icon: string }> = [];

  // Get all streak badges user doesn't have
  const { data: badges } = await supabase
    .from('badges')
    .select('id, name, icon, requirement_value')
    .eq('requirement_type', 'streak')
    .lte('requirement_value', streak);

  if (!badges) return earnedBadges;

  // Get user's existing badges
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const existingBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

  // Award new badges
  for (const badge of badges) {
    if (!existingBadgeIds.has(badge.id)) {
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badge.id,
      });
      earnedBadges.push({ name: badge.name, icon: badge.icon });
    }
  }

  return earnedBadges;
}
