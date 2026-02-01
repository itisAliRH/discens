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
  LuTrash2,
  LuPlus,
  LuCheck,
} from '@/components/ui/icons';

type OnboardingStep = 'language' | 'method' | 'description' | 'quiz' | 'words-preview' | 'review';

interface GeneratedWord {
  word: string;
  article: string | null;
  meaning: string;
  pronunciation: string | null;
  examples: string[];
  synonyms: string[];
  partOfSpeech: string;
  pluralForm: string | null;
  categories: string[];
  difficultyLevel: number;
  cefrLevel: string;
}

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
  const [generatedWords, setGeneratedWords] = useState<GeneratedWord[]>([]);
  const [isGeneratingWords, setIsGeneratingWords] = useState(false);
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [newWordForm, setNewWordForm] = useState<Partial<GeneratedWord> | null>(null);

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

  const handleDescriptionSubmit = async () => {
    if (description.trim().length < 10) {
      setError('Please provide a bit more detail about your language level');
      return;
    }
    setError(null);
    
    // If "Describe Your Level" method, generate words
    if (selectedMethod === 'description') {
      setIsGeneratingWords(true);
      setIsLoading(true); // Show loading on button
      try {
        const response = await fetch('/api/onboarding/generate-words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            targetLanguage,
            nativeLanguage: targetLanguage === 'de' ? 'en' : 'en',
            selectedCategories,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate words');
        }

        if (result.success && result.words) {
          setGeneratedWords(result.words);
          setStep('words-preview');
        } else {
          // Fallback to review step if generation fails
          setStep('review');
        }
      } catch (err) {
        console.error('Word generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate words');
        // Fallback to review step
        setStep('review');
      } finally {
        setIsGeneratingWords(false);
        setIsLoading(false);
      }
    } else {
      // For other methods, go directly to review
      setStep('review');
    }
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

  const handleWordsConfirm = useCallback(async () => {
    if (!targetLanguage || !supabase || generatedWords.length === 0) return;
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Store preferences in localStorage and show login prompt
      localStorage.setItem('onboarding_preferences', JSON.stringify({
        targetLanguage,
        description,
        selectedCategories,
        selectedMethod,
        generatedWords,
      }));
      setShowLoginPrompt(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Use server-side API to complete onboarding with words (bypasses RLS)
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLanguage,
          description,
          selectedCategories,
          generatedWords, // Include generated words
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding');
      }

      // Clear stored preferences
      localStorage.removeItem('onboarding_preferences');

      // Navigate to memory page to review the words
      router.push('/memory');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [targetLanguage, supabase, description, selectedCategories, selectedMethod, generatedWords, router]);

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
        if (prefs.generatedWords) setGeneratedWords(prefs.generatedWords);
        // If words exist, go to words-preview, otherwise review
        setStep(prefs.generatedWords ? 'words-preview' : 'review');
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
                (s === 'method' && ['description', 'quiz', 'words-preview', 'review'].includes(step)) ||
                (s === 'review' && step === 'words-preview')
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
                disabled={isGeneratingWords || isLoading}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingWords || isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    <span>Generating...</span>
                  </>
                ) : (
                  'Continue'
                )}
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

        {/* Step: Words Preview & Edit */}
        {step === 'words-preview' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep('description')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-3xl font-bold text-center mb-2">
              Review Your Vocabulary
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              We&apos;ve generated {generatedWords.length} words based on your description. Edit, add, or remove any words before continuing.
            </p>

            {isGeneratingWords ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI is creating draft memory for you</h3>
                  <p className="text-muted-foreground">Analyzing your description and generating personalized vocabulary...</p>
                </div>
                
                {/* Skeleton word cards */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-border bg-card animate-pulse"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-10 bg-muted rounded" />
                            <div className="h-6 w-24 bg-muted rounded" />
                            <div className="h-4 w-12 bg-muted rounded" />
                          </div>
                          <div className="h-4 w-48 bg-muted rounded" />
                          <div className="h-3 w-64 bg-muted rounded" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 w-8 bg-muted rounded" />
                          <div className="h-8 w-8 bg-muted rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Words List */}
                <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                  {generatedWords.map((word, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                    >
                      {editingWordIndex === index ? (
                        <WordEditForm
                          word={word}
                          targetLanguage={targetLanguage || 'de'}
                          onSave={(updated) => {
                            const updatedWords = [...generatedWords];
                            updatedWords[index] = updated;
                            setGeneratedWords(updatedWords);
                            setEditingWordIndex(null);
                          }}
                          onCancel={() => setEditingWordIndex(null)}
                        />
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {word.article && (
                                <span className="text-primary font-semibold">{word.article}</span>
                              )}
                              <span className="text-lg font-semibold">{word.word}</span>
                              {word.partOfSpeech && (
                                <span className="text-xs text-muted-foreground">({word.partOfSpeech})</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{word.meaning}</p>
                            {word.categories && word.categories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {word.categories.map((cat, i) => {
                                  const categoryInfo = CATEGORIES.find(c => c.id === cat);
                                  return (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                                    >
                                      {categoryInfo?.name || cat}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {word.examples && word.examples.length > 0 && (
                              <p className="text-xs text-muted-foreground italic">
                                &quot;{word.examples[0]}&quot;
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingWordIndex(index)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Edit word"
                          >
                            <LuPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setGeneratedWords(generatedWords.filter((_, i) => i !== index));
                            }}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Remove word"
                          >
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Word Button */}
                {newWordForm ? (
                  <div className="mb-6 p-4 rounded-xl border border-border bg-card">
                    <WordEditForm
                      word={newWordForm as GeneratedWord}
                      targetLanguage={targetLanguage || 'de'}
                      onSave={(newWord) => {
                        setGeneratedWords([...generatedWords, newWord]);
                        setNewWordForm(null);
                      }}
                      onCancel={() => setNewWordForm(null)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setNewWordForm({
                      word: '',
                      article: null,
                      meaning: '',
                      pronunciation: null,
                      examples: [],
                      synonyms: [],
                      partOfSpeech: 'noun',
                      pluralForm: null,
                      categories: ['daily_life'],
                      difficultyLevel: 1,
                      cefrLevel: 'A1',
                    })}
                    className="w-full mb-6 p-4 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <LuPlus className="w-5 h-5 text-primary" />
                    <span className="text-primary font-medium">Add New Word</span>
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('description')}
                    className="flex-1 px-6 py-3 rounded-xl border border-border hover:bg-accent"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleWordsConfirm}
                    disabled={isLoading || generatedWords.length === 0}
                    className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Saving...' : <><span>Save & Continue</span><LuRocket className="w-5 h-5" /></>}
                  </button>
                </div>
              </>
            )}
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

// Word Edit Form Component
function WordEditForm({
  word,
  targetLanguage,
  onSave,
  onCancel,
}: {
  word: GeneratedWord | Partial<GeneratedWord>;
  targetLanguage: LanguageCode;
  onSave: (word: GeneratedWord) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<GeneratedWord>>(word);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.word && formData.meaning) {
      // Ensure categories is an array and limit to 5
      const categories = Array.isArray(formData.categories) 
        ? formData.categories.slice(0, 5)
        : formData.categories && formData.categories.length > 0
          ? formData.categories
          : ['daily_life'];
      
      onSave({
        word: formData.word,
        article: formData.article || null,
        meaning: formData.meaning,
        pronunciation: formData.pronunciation || null,
        examples: formData.examples || [],
        synonyms: formData.synonyms || [],
        partOfSpeech: formData.partOfSpeech || 'noun',
        pluralForm: formData.pluralForm || null,
        categories: categories,
        difficultyLevel: formData.difficultyLevel || 1,
        cefrLevel: formData.cefrLevel || 'A1',
      } as GeneratedWord);
    }
  };

  const toggleCategory = (categoryId: MaterialCategory) => {
    const currentCategories = Array.isArray(formData.categories) ? formData.categories : [];
    const isSelected = currentCategories.includes(categoryId);
    
    if (isSelected) {
      // Remove category
      setFormData({ ...formData, categories: currentCategories.filter(c => c !== categoryId) });
    } else {
      // Add category (max 5)
      if (currentCategories.length < 5) {
        setFormData({ ...formData, categories: [...currentCategories, categoryId] });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {targetLanguage === 'de' && (
          <select
            value={formData.article || ''}
            onChange={(e) => setFormData({ ...formData, article: e.target.value || null })}
            className="w-20 px-2 py-1 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">-</option>
            <option value="der">der</option>
            <option value="die">die</option>
            <option value="das">das</option>
          </select>
        )}
        <input
          type="text"
          value={formData.word || ''}
          onChange={(e) => setFormData({ ...formData, word: e.target.value })}
          placeholder="Word"
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          required
        />
      </div>
      <input
        type="text"
        value={formData.meaning || ''}
        onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
        placeholder="Meaning"
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
        required
      />
      
      {/* Categories Selection */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Categories (max 5): {Array.isArray(formData.categories) ? formData.categories.length : 0}/5
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const isSelected = Array.isArray(formData.categories) && formData.categories.includes(category.id);
            const isDisabled = !isSelected && Array.isArray(formData.categories) && formData.categories.length >= 5;
            
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                disabled={isDisabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isDisabled
                    ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span className="text-sm">{category.icon}</span>
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <LuCheck className="w-4 h-4 inline mr-1" />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
