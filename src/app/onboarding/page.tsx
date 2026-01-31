'use client';

import { useUntypedSupabase } from '@/lib/supabase/client-untyped';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import type { LanguageCode, MaterialCategory } from '@/types/database';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  LuArrowLeft,
  LuPencil,
  LuFileText,
  LuSprout,
  LuChartBar,
  LuPlane,
  LuBriefcase,
  LuShoppingCart,
  LuStethoscope,
  LuUtensils,
  LuHouse,
  LuBookOpen,
  LuClapperboard,
  LuUsers,
  LuSun,
  LuLock,
  LuRocket,
} from '@/components/ui/icons';

type OnboardingStep = 'language' | 'method' | 'description' | 'quiz' | 'review';

interface MemoryInitMethod {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const INIT_METHODS: MemoryInitMethod[] = [
  {
    id: 'description',
    title: 'Describe Your Level',
    description: 'Tell us about your language skills in your own words',
    icon: <LuPencil className="w-7 h-7" />,
  },
  {
    id: 'quiz',
    title: 'Quick Assessment',
    description: 'Take a short quiz to determine your level',
    icon: <LuFileText className="w-7 h-7" />,
  },
  {
    id: 'empty',
    title: 'Start Fresh',
    description: 'Begin with an empty memory and add materials manually',
    icon: <LuSprout className="w-7 h-7" />,
  },
  {
    id: 'cefr',
    title: 'Choose CEFR Level',
    description: 'Select your proficiency level (A1-C2)',
    icon: <LuChartBar className="w-7 h-7" />,
  },
];

const CATEGORIES: { id: MaterialCategory; name: string; icon: ReactNode }[] = [
  { id: 'travel', name: 'Travel', icon: <LuPlane className="w-5 h-5" /> },
  { id: 'work', name: 'Work', icon: <LuBriefcase className="w-5 h-5" /> },
  { id: 'shopping', name: 'Shopping', icon: <LuShoppingCart className="w-5 h-5" /> },
  { id: 'health', name: 'Health', icon: <LuStethoscope className="w-5 h-5" /> },
  { id: 'food', name: 'Food & Dining', icon: <LuUtensils className="w-5 h-5" /> },
  { id: 'housing', name: 'Housing', icon: <LuHouse className="w-5 h-5" /> },
  { id: 'education', name: 'Education', icon: <LuBookOpen className="w-5 h-5" /> },
  { id: 'entertainment', name: 'Entertainment', icon: <LuClapperboard className="w-5 h-5" /> },
  { id: 'social', name: 'Social', icon: <LuUsers className="w-5 h-5" /> },
  { id: 'daily_life', name: 'Daily Life', icon: <LuSun className="w-5 h-5" /> },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useUntypedSupabase();
  
  const [step, setStep] = useState<OnboardingStep>('language');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<MaterialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    if (!supabase) return;
    
    async function checkAuth() {
      const { data: { user } } = await supabase!.auth.getUser();
      setIsLoggedIn(!!user);
      
      // If logged in and has completed onboarding, redirect to dashboard
      if (user) {
        const { data: memory } = await supabase!
          .from('memories')
          .select('summary')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (memory && memory.summary && memory.summary !== '') {
          router.replace('/dashboard');
        }
      }
    }
    checkAuth();
  }, [supabase, router]);

  const handleLanguageSelect = (lang: LanguageCode) => {
    setTargetLanguage(lang);
    setStep('method');
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    if (methodId === 'description') {
      setStep('description');
    } else if (methodId === 'empty' || methodId === 'cefr') {
      // Skip to category selection
      setStep('review');
    } else if (methodId === 'quiz') {
      setStep('quiz');
    }
  };

  const handleDescriptionSubmit = () => {
    if (description.trim().length < 10) {
      setError('Please provide a bit more detail about your language level');
      return;
    }
    setError(null);
    setStep('review');
  };

  const toggleCategory = (category: MaterialCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, category];
    });
  };

  const handleComplete = useCallback(async () => {
    if (!targetLanguage || !supabase) return;
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Store preferences in localStorage and show login prompt
      localStorage.setItem('onboarding_preferences', JSON.stringify({
        targetLanguage,
        description,
        selectedCategories,
        selectedMethod,
      }));
      setShowLoginPrompt(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Use server-side API to complete onboarding (bypasses RLS)
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage,
          description,
          selectedCategories,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding');
      }

      // Clear stored preferences
      localStorage.removeItem('onboarding_preferences');

      // Navigate to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [targetLanguage, supabase, description, selectedCategories, selectedMethod, router]);

  // Load preferences from localStorage on mount (for users returning after login)
  const [shouldAutoComplete, setShouldAutoComplete] = useState(false);
  
  useEffect(() => {
    const stored = localStorage.getItem('onboarding_preferences');
    if (stored && isLoggedIn) {
      try {
        const prefs = JSON.parse(stored);
        if (prefs.targetLanguage) setTargetLanguage(prefs.targetLanguage);
        if (prefs.description) setDescription(prefs.description);
        if (prefs.selectedCategories) setSelectedCategories(prefs.selectedCategories);
        if (prefs.selectedMethod) setSelectedMethod(prefs.selectedMethod);
        setStep('review');
        setShouldAutoComplete(true);
      } catch {
        localStorage.removeItem('onboarding_preferences');
      }
    }
  }, [isLoggedIn]);

  // Auto-complete when preferences are loaded
  useEffect(() => {
    if (shouldAutoComplete && targetLanguage && isLoggedIn) {
      handleComplete();
      setShouldAutoComplete(false);
    }
  }, [shouldAutoComplete, targetLanguage, isLoggedIn]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      {/* Back to Home Button */}
      <div className="w-full max-w-2xl mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <LuArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-lg">
            <div className="text-center mb-6">
              <span className="flex justify-center mb-4"><LuLock className="w-12 h-12 text-primary" /></span>
              <h2 className="text-2xl font-bold mb-2">Create an Account</h2>
              <p className="text-muted-foreground">
                Sign up or log in to save your learning preferences and start your journey!
              </p>
            </div>
            
            <div className="space-y-3">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign Up / Log In
              </Link>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full px-4 py-3 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['language', 'method', 'review'].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s || 
                (s === 'language' && step !== 'language') ||
                (s === 'method' && ['description', 'quiz', 'review'].includes(step))
                  ? 'bg-primary w-8'
                  : 'bg-muted w-4'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 mb-6">
            {error}
          </div>
        )}

        {/* Step: Language Selection */}
        {step === 'language' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-center mb-2">
              What language do you want to learn?
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Choose the language you want to master
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleLanguageSelect('de')}
                className="p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <span className="text-4xl font-bold mb-4 block text-primary">DE</span>
                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                  German
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Deutsch lernen
                </p>
              </button>

              <button
                onClick={() => handleLanguageSelect('en')}
                className="p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <span className="text-4xl font-bold mb-4 block text-primary">EN</span>
                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                  English
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Learn English
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step: Method Selection */}
        {step === 'method' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep('language')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-bold text-center mb-2">
              How would you like to start?
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              We&apos;ll personalize your learning experience
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INIT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className="p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <span className="text-3xl mb-3 block">{method.icon}</span>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {method.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {method.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Description Input */}
        {step === 'description' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep('method')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-bold text-center mb-2">
              Describe your level
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Tell us what you can do in {targetLanguage === 'de' ? 'German' : 'English'}
            </p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`For example:\n- I can order food at a restaurant\n- I struggle with articles (der/die/das)\n- I can have basic conversations but get confused with grammar`}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />

            <div className="flex justify-end mt-4">
              <button
                onClick={handleDescriptionSubmit}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: Quiz (placeholder) */}
        {step === 'quiz' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep('method')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-bold text-center mb-2">
              Quick Assessment
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Coming soon! For now, let&apos;s continue with setting up your preferences.
            </p>

            <button
              onClick={() => setStep('review')}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Continue to Preferences
            </button>
          </div>
        )}

        {/* Step: Review & Categories */}
        {step === 'review' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep(selectedMethod === 'description' ? 'description' : 'method')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-bold text-center mb-2">
              What topics interest you?
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Select up to 5 categories to focus on
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedCategories.includes(category.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleComplete}
              disabled={isLoading}
              className="w-full px-6 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Setting up...' : <><span>Start Learning</span><LuRocket className="w-5 h-5" /></>}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
