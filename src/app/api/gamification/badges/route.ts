import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/gamification/badges
 * Get user's badges and available badges
 */
export async function GET() {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all badges
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*')
      .order('requirement_value', { ascending: true });

    // Get user's earned badges
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('user_id', user.id);

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
    const earnedBadgesMap = new Map(userBadges?.map(ub => [ub.badge_id, ub.earned_at]) || []);

    // Categorize badges
    const earned = allBadges?.filter(b => earnedBadgeIds.has(b.id)).map(b => ({
      ...b,
      earned_at: earnedBadgesMap.get(b.id),
    })) || [];

    const available = allBadges?.filter(b => !earnedBadgeIds.has(b.id)) || [];

    return NextResponse.json({
      earned,
      available,
      totalEarned: earned.length,
      totalAvailable: allBadges?.length || 0,
    });
  } catch (error) {
    console.error('Badges fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gamification/badges
 * Check and award new badges based on current progress
 */
export async function POST() {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user stats
    const [profileResult, memoryResult, streakResult, sessionsResult] = await Promise.all([
      supabase.from('profiles').select('total_xp').eq('id', user.id).single(),
      supabase.from('memories').select('total_materials, mastered_materials').eq('user_id', user.id).single(),
      supabase.from('streaks').select('current_streak, total_time_minutes').eq('user_id', user.id).single(),
      supabase.from('learning_sessions').select('id, session_type').eq('user_id', user.id),
    ]);

    const stats = {
      materials: memoryResult.data?.total_materials || 0,
      mastered: memoryResult.data?.mastered_materials || 0,
      streak: streakResult.data?.current_streak || 0,
      time: streakResult.data?.total_time_minutes || 0,
      conversations: sessionsResult.data?.filter(s => s.session_type === 'conversation').length || 0,
    };

    // Get all badges user doesn't have
    const { data: allBadges } = await supabase.from('badges').select('*');
    const { data: userBadges } = await supabase.from('user_badges').select('badge_id').eq('user_id', user.id);
    
    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
    const newlyEarned: Array<{ name: string; icon: string; xp_reward: number }> = [];
    let totalXpEarned = 0;

    for (const badge of allBadges || []) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let earned = false;
      switch (badge.requirement_type) {
        case 'materials':
          earned = stats.materials >= badge.requirement_value;
          break;
        case 'streak':
          earned = stats.streak >= badge.requirement_value;
          break;
        case 'time':
          earned = stats.time >= badge.requirement_value;
          break;
        case 'conversations':
          earned = stats.conversations >= badge.requirement_value;
          break;
      }

      if (earned) {
        await supabase.from('user_badges').insert({
          user_id: user.id,
          badge_id: badge.id,
        });
        newlyEarned.push({
          name: badge.name,
          icon: badge.icon,
          xp_reward: badge.xp_reward,
        });
        totalXpEarned += badge.xp_reward;
      }
    }

    // Award XP for new badges
    if (totalXpEarned > 0) {
      await supabase
        .from('profiles')
        .update({ total_xp: (profileResult.data?.total_xp || 0) + totalXpEarned })
        .eq('id', user.id);
    }

    return NextResponse.json({
      newBadges: newlyEarned,
      xpEarned: totalXpEarned,
    });
  } catch (error) {
    console.error('Badge check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
