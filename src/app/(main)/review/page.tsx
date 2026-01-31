'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
}

export default function ReviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRating, setIsRating] = useState(false);

  // Fetch due cards
  useEffect(() => {
    async function loadCards() {
      try {
        const response = await fetch('/api/review/cards');
        
        if (!response.ok) {
          throw new Error('Failed to load review cards');
        }

        const data = await response.json();
        
        if (data.cards.length === 0) {
          setIsLoading(false);
          return;
        }

        setSession({
          cards: data.cards,
          currentIndex: 0,
          results: [],
          startTime: Date.now(),
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Load cards error:', error);
        setIsLoading(false);
      }
    }

    loadCards();
  }, []);

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
    } catch (error) {
      console.error('Rating error:', error);
    } finally {
      setIsRating(false);
    }
  }, [session, isRating]);

  // Check if session is complete
  useEffect(() => {
    if (session && session.currentIndex >= session.cards.length) {
      // Calculate totals
      const totalXP = session.results.reduce((sum, r) => sum + r.xpEarned, 0);
      router.push(`/dashboard?reviewed=${session.results.length}&xp=${totalXP}`);
    }
  }, [session, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Finding cards to review...</p>
        </div>
      </div>
    );
  }

  // No cards to review
  if (!session || session.cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
          <p className="text-muted-foreground mb-6">
            No cards due for review right now. Come back later or learn new materials!
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/learn')}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Learn New
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl border border-border hover:bg-accent"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session complete
  if (session.currentIndex >= session.cards.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Saving progress...</p>
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
          <span>Card {session.currentIndex + 1} of {session.cards.length}</span>
          <span>+{session.results.reduce((s, r) => s + r.xpEarned, 0)} XP</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
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
