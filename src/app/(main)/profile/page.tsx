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
} from '@/components/ui/icons';

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl overflow-hidden">
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

      {/* Settings Link */}
      <div className="mt-8 text-center">
        <Link
          href="/settings"
          className="text-primary hover:underline text-sm"
        >
          Account Settings →
        </Link>
      </div>
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
