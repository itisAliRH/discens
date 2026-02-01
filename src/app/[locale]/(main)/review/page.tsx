'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { QuizType } from '@/types/database';
import QuizTypeSelector from '@/components/quiz/QuizTypeSelector';
import {
  LuLock,
  LuFileText,
  LuRefreshCw,
} from '@/components/ui/icons';
import { TbMoodConfuzed } from '@/components/ui/icons';
import { PiConfetti } from '@/components/ui/icons';

interface ReviewCard {
  id: string;
  material_id: string;
  stability: number;
  difficulty: number;
  state: string;
  due: string;
  reps: number;
  lapses: number;
  materials: {
    id: string;
    type: string;
    content: {
      word?: string;
      phrase?: string;
      rule?: string;
      meaning?: string;
      explanation?: string;
      examples?: string[];
      article?: string;
    };
    categories: string[];
    mastery_level: number;
  };
}

interface SessionState {
  cards: ReviewCard[];
  currentIndex: number;
  results: Array<{
    cardId: string;
    rating: string;
    xpEarned: number;
  }>;
  startTime: number;
  sessionId: string;
  materialIds: string[];
}

type ViewState = 'select' | 'review' | 'loading';

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewState>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'setup' | 'generic'>('generic');
  const [session, setSession] = useState<SessionState | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<QuizType[]>(['multiple_choice', 'fill_blank']);

  // Get conversation scenario ID from URL if present
  const conversationScenarioId = searchParams.get('scenario');

  // Start review session
  const startSession = useCallback(async () => {
    if (selectedQuizTypes.length === 0) {
      setError('Please select at least one quiz type');
      setErrorType('generic');
      return;
    }

    setIsLoading(true);
    setError(null);
    setView('loading');

    try {
      // Create review session
      const sessionResponse = await fetch('/api/learning-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'review',
          quizTypes: selectedQuizTypes,
          conversationScenarioId: conversationScenarioId || undefined,
        }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        
        if (sessionResponse.status === 401) {
          setErrorType('auth');
          setError('Please log in to access your reviews');
        } else if (sessionResponse.status === 404) {
          setErrorType('setup');
          setError('Complete your profile setup first');
        } else {
          setErrorType('generic');
          setError(errorData.error || 'Failed to create session');
        }
        setIsLoading(false);
        setView('select');
        return;
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.session.id;

      // Generate quiz from existing materials (review mode)
      const quizResponse = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 5,
          quizTypes: selectedQuizTypes,
          isReview: true, // Review mode: use ONLY existing materials
          sessionId,
          conversationScenarioId: conversationScenarioId || undefined,
          createNewMaterials: false,
        }),
      });

      if (!quizResponse.ok) {
        const errorData = await quizResponse.json().catch(() => ({}));
        
        if (quizResponse.status === 401) {
          setErrorType('auth');
          setError('Please log in to access your reviews');
        } else if (quizResponse.status === 404) {
          setErrorType('setup');
          setError('Complete your profile setup first');
        } else {
          setErrorType('generic');
          setError(errorData.error || 'Failed to generate review');
        }
        setIsLoading(false);
        setView('select');
        return;
      }

      // For review, we still use the review cards system
      // But we can also generate quiz questions from existing materials
      const cardsResponse = await fetch('/api/review/cards');

      if (!cardsResponse.ok) {
        const errorData = await cardsResponse.json().catch(() => ({}));
        setErrorType('generic');
        setError(errorData.error || 'Failed to load review cards');
        setIsLoading(false);
        setView('select');
        return;
      }

      const cardsData = await cardsResponse.json();
      
      if (!cardsData.cards || cardsData.cards.length === 0) {
        setIsLoading(false);
        setView('select');
        return;
      }

      const materialIds = cardsData.cards.map((c: ReviewCard) => c.material_id);

      setSession({
        cards: cardsData.cards,
        currentIndex: 0,
        results: [],
        startTime: Date.now(),
        sessionId,
        materialIds,
      });
      setIsLoading(false);
      setView('review');
    } catch (err) {
      console.error('Session start error:', err);
      setErrorType('generic');
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setIsLoading(false);
      setView('select');
    }
  }, [selectedQuizTypes, conversationScenarioId]);

  // Handle rating
  const handleRate = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!session || isRating) return;
    
    setIsRating(true);
    const card = session.cards[session.currentIndex];

    try {
      const response = await fetch('/api/review/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          rating,
        }),
      });

      const result = await response.json();

      // Update session
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          results: [
            ...prev.results,
            {
              cardId: card.id,
              rating,
              xpEarned: result.xpEarned || 0,
            },
          ],
          currentIndex: prev.currentIndex + 1,
        };
      });

      setShowAnswer(false);
    } catch (err) {
      console.error('Rating error:', err);
    } finally {
      setIsRating(false);
    }
  }, [session, isRating]);

  // Check if session is complete
  useEffect(() => {
    if (session && session.currentIndex >= session.cards.length && view === 'review') {
      // Complete session
      const completeSession = async () => {
        const totalXP = session.results.reduce((sum, r) => sum + r.xpEarned, 0);
        const correct = session.results.filter(r => r.rating === 'good' || r.rating === 'easy').length;
        const incorrect = session.results.filter(r => r.rating === 'again' || r.rating === 'hard').length;
        const duration = Math.floor((Date.now() - session.startTime) / 1000);

        try {
          // Update session with results
          await fetch(`/api/learning-sessions/${session.sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              materialsCovered: session.materialIds,
              correctCount: correct,
              incorrectCount: incorrect,
              skippedCount: 0,
              durationSeconds: duration,
              completed: true,
            }),
          });

          // Update memory summary
          await fetch('/api/memory/summary', {
            method: 'POST',
          });

          router.push(`/dashboard?reviewed=${session.results.length}&xp=${totalXP}`);
        } catch (err) {
          console.error('Session completion error:', err);
          // Still redirect even if update fails
          router.push(`/dashboard?reviewed=${session.results.length}&xp=${totalXP}`);
        }
      };

      completeSession();
    }
  }, [session, router, view]);

  // Quiz type selection view
  if (view === 'select') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Start Review</h1>
          <p className="text-muted-foreground">
            Choose how you want to review. Questions will be generated from your existing vocabulary.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 mb-6">
          <QuizTypeSelector
            onSelect={setSelectedQuizTypes}
            defaultTypes={selectedQuizTypes}
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-xl border border-border hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={startSession}
            disabled={isLoading || selectedQuizTypes.length === 0}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Start Review
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || view === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LuRefreshCw className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-lg font-medium">Finding cards to review...</p>
          <p className="text-muted-foreground/70 text-sm mt-2">Loading your review session</p>
        </div>
      </div>
    );
  }

  // Error state with helpful actions
  if (error) {
    const errorIcon = {
      auth: <LuLock className="w-14 h-14 text-primary" />,
      setup: <LuFileText className="w-14 h-14 text-primary" />,
      generic: <TbMoodConfuzed className="w-14 h-14 text-muted-foreground" />,
    }[errorType];
    
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center bg-card border border-border rounded-2xl p-8">
          <span className="flex justify-center mb-4">
            {errorIcon}
          </span>
          <h2 className="text-xl font-semibold mb-2">
            {errorType === 'auth' ? 'Login Required' : 
             errorType === 'setup' ? 'Setup Incomplete' : 'Oops!'}
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          
          {errorType === 'auth' && (
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Log In
            </Link>
          )}
          
          {errorType === 'setup' && (
            <Link
              href="/onboarding"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Complete Setup
            </Link>
          )}
          
          {errorType === 'generic' && (
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // No cards to review
  if (!session || session.cards.length === 0 || view !== 'review') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center bg-card border border-border rounded-2xl p-8">
          <span className="flex justify-center mb-4"><PiConfetti className="w-14 h-14 text-primary" /></span>
          <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
          <p className="text-muted-foreground mb-6">
            No cards due for review right now. Come back later or learn new materials!
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/learn"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Learn New
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl border border-border hover:bg-accent"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Session complete (handled in useEffect)
  if (session.currentIndex >= session.cards.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Saving progress and updating memory...</p>
        </div>
      </div>
    );
  }

  const card = session.cards[session.currentIndex];
  const material = card.materials;
  const progress = ((session.currentIndex + 1) / session.cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span className="font-medium">Card {session.currentIndex + 1} of {session.cards.length}</span>
          <span className="text-primary font-semibold">+{session.results.reduce((s, r) => s + r.xpEarned, 0)} XP</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        {/* Front (Question) */}
        <div className="p-8 text-center">
          <div className="text-sm text-muted-foreground mb-4 capitalize">
            {material.type} • {material.categories[0]?.replace('_', ' ')}
          </div>
          
          {material.type === 'word' && (
            <div>
              <div className="text-3xl font-bold mb-2">
                {material.content.article && (
                  <span className="text-primary">{material.content.article} </span>
                )}
                {material.content.word}
              </div>
            </div>
          )}
          
          {material.type === 'phrase' && (
            <div className="text-2xl font-semibold">
              {material.content.phrase}
            </div>
          )}
          
          {material.type === 'grammar' && (
            <div className="text-xl">
              {material.content.rule}
            </div>
          )}
        </div>

        {/* Divider / Show button */}
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            Show Answer
          </button>
        ) : (
          <>
            {/* Back (Answer) */}
            <div className="border-t border-border p-8 bg-muted/30">
              <div className="text-center">
                <div className="text-xl font-semibold mb-4">
                  {material.content.meaning || material.content.explanation}
                </div>
                
                {material.content.examples && material.content.examples.length > 0 && (
                  <div className="text-muted-foreground text-sm space-y-2 mt-4">
                    {material.content.examples.map((example, i) => (
                      <p key={i} className="italic">&quot;{example}&quot;</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rating buttons */}
            <div className="p-4 bg-card border-t border-border">
              <p className="text-center text-sm text-muted-foreground mb-3">
                How well did you know this?
              </p>
              <div className="grid grid-cols-4 gap-2">
                <RatingButton
                  label="Again"
                  sublabel="< 1m"
                  color="red"
                  onClick={() => handleRate('again')}
                  disabled={isRating}
                />
                <RatingButton
                  label="Hard"
                  sublabel="< 6m"
                  color="orange"
                  onClick={() => handleRate('hard')}
                  disabled={isRating}
                />
                <RatingButton
                  label="Good"
                  sublabel="< 10m"
                  color="blue"
                  onClick={() => handleRate('good')}
                  disabled={isRating}
                />
                <RatingButton
                  label="Easy"
                  sublabel="4d"
                  color="green"
                  onClick={() => handleRate('easy')}
                  disabled={isRating}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card info */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span>Reviews: {card.reps}</span>
        <span>•</span>
        <span>Lapses: {card.lapses}</span>
        <span>•</span>
        <span>State: {card.state}</span>
      </div>
    </div>
  );
}

function RatingButton({
  label,
  sublabel,
  color,
  onClick,
  disabled,
}: {
  label: string;
  sublabel: string;
  color: 'red' | 'orange' | 'blue' | 'green';
  onClick: () => void;
  disabled: boolean;
}) {
  const colorClasses = {
    red: 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400',
    orange: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    blue: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-3 rounded-xl font-medium transition-colors disabled:opacity-50 ${colorClasses[color]}`}
    >
      <div className="text-sm">{label}</div>
      <div className="text-xs opacity-70">{sublabel}</div>
    </button>
  );
}
