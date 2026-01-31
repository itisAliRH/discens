'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  LuGraduationCap,
  LuBrain,
  LuRefreshCw,
  LuMessageCircle,
  LuTarget,
  LuChartBar,
  LuTrophy,
  LuGlobe,
} from '@/components/ui/icons';

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) return;
    
    async function checkAuth() {
      const { data: { user } } = await supabase!.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();
  }, [supabase]);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/onboarding');
    }
  };

  return (
    <main className="min-h-dvh">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background pointer-events-none" />
        <div className="absolute top-20 -right-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-32">
          {/* Hero Content */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <LuGraduationCap className="w-4 h-4" /> AI-Powered Language Learning
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Learn Languages<br />
              <span className="text-primary">With Your Memory</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Discens adapts to you. Your vocabulary, your mistakes, your pace. 
              Powered by AI and spaced repetition for truly personalized learning.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 text-lg font-semibold bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all hover:scale-105"
              >
                {isLoggedIn ? 'Go to Dashboard →' : 'Start Learning Free →'}
              </button>
              <Link
                href="#features"
                className="px-8 py-4 text-lg font-semibold border border-border rounded-2xl hover:bg-accent transition-all"
              >
                See Features
              </Link>
            </div>
          </div>

          {/* Language badges */}
          <div className="flex justify-center gap-4 mt-16">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
              <span className="font-bold text-sm">DE</span>
              <span className="font-medium">German</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
              <span className="font-bold text-sm">EN</span>
              <span className="font-medium">English</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border text-muted-foreground">
              <LuGlobe className="w-4 h-4" />
              <span>More coming...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-card/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Learn Smarter, Not Harder
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discens combines cutting-edge AI with proven learning science
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<LuBrain className="w-8 h-8" />}
              title="Personal Memory"
              description="Your vocabulary, phrases, and grammar stored in one place. AI generates content based on what YOU need to learn."
            />
            <FeatureCard
              icon={<LuRefreshCw className="w-8 h-8" />}
              title="Spaced Repetition"
              description="FSRS algorithm ensures you review at the perfect time. Never forget what you've learned."
            />
            <FeatureCard
              icon={<LuMessageCircle className="w-8 h-8" />}
              title="Real Conversations"
              description="Practice speaking with AI in realistic scenarios. Get corrections after, not during."
            />
            <FeatureCard
              icon={<LuTarget className="w-8 h-8" />}
              title="Smart Quizzes"
              description="Multiple choice, fill-in-blank, true/false—generated specifically from your materials."
            />
            <FeatureCard
              icon={<LuChartBar className="w-8 h-8" />}
              title="Mistake Analysis"
              description="AI identifies your common errors and creates targeted exercises to fix them."
            />
            <FeatureCard
              icon={<LuTrophy className="w-8 h-8" />}
              title="Gamification"
              description="Earn gems, badges, and maintain streaks. Learning should be fun!"
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="Build Your Memory"
              description="Tell us about your level or take a quick test. We'll create your personalized starting point."
            />
            <StepCard
              step={2}
              title="Learn & Review"
              description="Study new materials and review them at optimal intervals. AI adapts to your progress."
            />
            <StepCard
              step={3}
              title="Practice Speaking"
              description="Have real conversations with AI tutors in everyday scenarios. Build confidence naturally."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join Discens today and experience personalized language learning.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-block px-10 py-4 text-lg font-semibold bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all hover:scale-105"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                D
              </div>
              <span className="font-semibold">Discens</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for the Hamburg Cursor Hackathon 2026
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
      <span className="text-primary mb-4 block">{icon}</span>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
