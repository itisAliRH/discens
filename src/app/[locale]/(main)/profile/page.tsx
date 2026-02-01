import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  LuUser,
  LuFlame,
  LuBookOpen,
  LuStar,
  LuGem,
  LuTrophy,
  LuCalendar,
  LuMedal,
  LuClock,
  LuEdit,
  LuCrown,
  LuArrowRight,
} from '@/components/ui/icons';

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profile',
};

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  earned_at?: string;
}

export default async function ProfilePage() {
  const supabase = await createUntypedServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch user data
  const [profileResult, memoryResult, streakResult, badgesResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('memories').select('*').eq('user_id', user.id).single(),
    supabase.from('streaks').select('*').eq('user_id', user.id).single(),
    supabase.from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', user.id),
  ]);

  const profile = profileResult.data;
  const memory = memoryResult.data;
  const streak = streakResult.data;
  const userBadges = badgesResult.data?.map(ub => ({
    ...ub.badges,
    earned_at: ub.earned_at,
  })) as Badge[] || [];

  // Calculate level from XP
  const xp = profile?.total_xp || 0;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpProgress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  // Mock current subscription (in a real app, fetch from database)
  const currentSubscription = {
    tier: 'free',
    name: 'Free',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl overflow-hidden border-2 border-border shadow-lg">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Profile" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <LuUser className="w-10 h-10 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Language Learner'}</h1>
            <p className="text-muted-foreground">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium">Level {level}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{xp} XP</span>
            </div>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <LuEdit className="w-4 h-4" />
          Edit Profile
        </Link>
      </div>

      {/* XP Progress */}
      <div className="mb-8 p-4 rounded-xl bg-card border border-border">
        <div className="flex justify-between text-sm mb-2">
          <span>Level {level}</span>
          <span className="text-muted-foreground">{xpForNextLevel - xp} XP to Level {level + 1}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      {/* Subscription Card */}
      <div className="mb-8">
        <Link
          href="/profile/billing"
          className="block p-6 rounded-xl bg-gradient-to-br from-primary/10 to-card border-2 border-primary/30 hover:border-primary/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <LuCrown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-lg mb-1">
                  {currentSubscription.name} Plan
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentSubscription.tier === 'free' 
                    ? 'Upgrade to unlock unlimited features'
                    : 'Manage your subscription'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary group-hover:translate-x-1 transition-transform">
              <span className="text-sm font-medium">
                {currentSubscription.tier === 'free' ? 'View Plans' : 'Manage'}
              </span>
              <LuArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<LuFlame className="w-5 h-5" />} value={streak?.current_streak || 0} label="Day Streak" />
        <StatCard icon={<LuBookOpen className="w-5 h-5" />} value={memory?.total_materials || 0} label="Materials" />
        <StatCard icon={<LuStar className="w-5 h-5" />} value={memory?.mastered_materials || 0} label="Mastered" />
        <StatCard icon={<LuGem className="w-5 h-5" />} value={profile?.gems || 0} label="Gems" />
        <StatCard icon={<LuTrophy className="w-5 h-5" />} value={streak?.longest_streak || 0} label="Best Streak" />
        <StatCard icon={<LuCalendar className="w-5 h-5" />} value={streak?.total_days_active || 0} label="Days Active" />
        <StatCard icon={<LuMedal className="w-5 h-5" />} value={userBadges.length} label="Badges" />
        <StatCard icon={<LuClock className="w-5 h-5" />} value={streak?.total_time_minutes || 0} label="Minutes" />
      </div>

      {/* Badges */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Badges</h2>
          <Link href="/badges" className="text-primary text-sm hover:underline">
            View All →
          </Link>
        </div>
        {userBadges.length > 0 ? (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
            {userBadges.slice(0, 12).map((badge) => (
              <div
                key={badge.id}
                className="p-4 rounded-xl bg-card border border-border text-center"
                title={badge.description}
              >
                <span className="text-3xl block mb-1">{badge.icon}</span>
                <span className="text-xs text-muted-foreground">{badge.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border-2 border-dashed border-border text-center text-muted-foreground">
            Complete activities to earn badges!
          </div>
        )}
      </div>

      {/* Learning Summary */}
      {memory?.summary && (
        <div className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold mb-2">Learning Summary</h2>
          <p className="text-muted-foreground">{memory.summary}</p>
        </div>
      )}

    </div>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
