import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Profile, Memory, Streak } from '@/types/database';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch user data
  const [profileResult, memoryResult, streakResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('memories').select('*').eq('user_id', user.id).single(),
    supabase.from('streaks').select('*').eq('user_id', user.id).single(),
  ]);

  const profile = profileResult.data as Profile | null;
  const memory = memoryResult.data as Memory | null;
  const streak = streakResult.data as Streak | null;

  // Check if onboarding needed
  if (memory && !memory.summary) {
    redirect('/onboarding');
  }

  // Generate engagement message based on streak
  const getEngagementMessage = (streakCount: number) => {
    if (streakCount >= 30) return 'Incredible dedication! You\'re a language master! 🏆';
    if (streakCount >= 7) return 'Your dedication is paying off! Keep going! 💪';
    if (streakCount >= 3) return 'Consistency is key. You\'re doing great! 🔑';
    return 'Ready to expand your vocabulary today? 🌟';
  };
  const engagementMessage = getEngagementMessage(streak?.current_streak || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-muted-foreground">{engagementMessage}</p>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="🔥"
          value={streak?.current_streak || 0}
          label="Day Streak"
          highlight={streak?.current_streak ? streak.current_streak >= 7 : false}
        />
        <StatCard
          icon="📚"
          value={memory?.total_materials || 0}
          label="Materials"
        />
        <StatCard
          icon="⭐"
          value={memory?.mastered_materials || 0}
          label="Mastered"
        />
        <StatCard
          icon="💎"
          value={profile?.gems || 0}
          label="Gems"
        />
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard
            href="/learn"
            icon="📖"
            title="Learn New"
            description="Discover new words and phrases"
            color="primary"
          />
          <ActionCard
            href="/review"
            icon="🔄"
            title="Review"
            description="Practice what you've learned"
            color="secondary"
          />
          <ActionCard
            href="/conversation"
            icon="💬"
            title="Real Conversation"
            description="Practice speaking with AI"
            color="accent"
          />
          <ActionCard
            href="/memory"
            icon="🧠"
            title="My Memory"
            description="View and manage your materials"
            color="muted"
          />
        </div>
      </section>

      {/* Learning Categories */}
      {memory?.top_categories && memory.top_categories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Focus Areas</h2>
          <div className="flex flex-wrap gap-2">
            {memory.top_categories.map((category) => (
              <span
                key={category}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm capitalize"
              >
                {category.replace('_', ' ')}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Learning Summary */}
      {memory?.summary && (
        <section className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span>📝</span> Your Learning Summary
          </h2>
          <p className="text-muted-foreground">{memory.summary}</p>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: string;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>
          {value}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'primary' | 'secondary' | 'accent' | 'muted';
}) {
  const colorClasses = {
    primary: 'hover:border-primary hover:bg-primary/5',
    secondary: 'hover:border-secondary-foreground/30 hover:bg-secondary',
    accent: 'hover:border-accent-foreground/30 hover:bg-accent',
    muted: 'hover:border-muted-foreground/30 hover:bg-muted',
  };

  return (
    <Link
      href={href}
      className={`p-6 rounded-xl border border-border bg-card transition-all ${colorClasses[color]} group`}
    >
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="font-semibold group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}
