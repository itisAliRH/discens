'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { QuizType } from '@/types/database';
import type { MultipleChoiceQuestion, TrueFalseQuestion, FillBlankQuestion, QuizBatch } from '@/lib/ai/quiz';
import QuizTypeSelector from '@/components/quiz/QuizTypeSelector';
import {
  LuLock,
  LuFileText,
  LuRefreshCw,
  LuBook,
  LuCheckCircle,
  LuCircle,
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

type ViewState = 'select' | 'review' | 'quiz' | 'loading' | 'feedback';

type Question = (MultipleChoiceQuestion & { type: 'multiple_choice' }) 
  | (TrueFalseQuestion & { type: 'true_false' }) 
  | (FillBlankQuestion & { type: 'fill_blank' });

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
  const [useFlashCards, setUseFlashCards] = useState(false);
  const [quizSession, setQuizSession] = useState<{
    questions: Question[];
    currentIndex: number;
    answers: Array<{
      isCorrect: boolean;
      userAnswer: string;
      feedback: string;
      timeSpent: number;
    }>;
    startTime: number;
    questionStartTime: number;
    sessionId: string;
    materialIds: string[];
  } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    totalXP: number;
    correct: number;
    incorrect: number;
    total: number;
    duration: number;
  } | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<{
    isCorrect: boolean;
    feedback: string;
    score: number;
  } | null>(null);

  // Get conversation scenario ID from URL if present
  const conversationScenarioId = searchParams.get('scenario');

  // Flatten quiz batch into array of questions
  function flattenQuestions(batch: QuizBatch): Question[] {
    const questions: Question[] = [];
    
    batch.multipleChoice?.forEach(q => {
      questions.push({ ...q, type: 'multiple_choice' });
    });
    batch.trueFalse?.forEach(q => {
      questions.push({ ...q, type: 'true_false' });
    });
    batch.fillBlank?.forEach(q => {
      questions.push({ ...q, type: 'fill_blank' });
    });
    
    return questions;
  }

  // Start review session
  const startSession = useCallback(async () => {
    if (!useFlashCards && selectedQuizTypes.length === 0) {
      setError('Please select at least one quiz type or flash cards');
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
          quizTypes: useFlashCards ? [] : selectedQuizTypes,
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

      // If using flash cards, use the flash card flow
      if (useFlashCards) {
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
        return;
      }

      // Otherwise, generate quiz questions from existing materials
      const quizResponse = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 10,
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

      const quizData = await quizResponse.json();
      const questions = flattenQuestions(quizData.questions);

      if (questions.length === 0) {
        setErrorType('generic');
        setError('No questions could be generated. Try selecting different quiz types or use flash cards.');
        setIsLoading(false);
        setView('select');
        return;
      }

      // Get material IDs from questions
      const materialIds = questions.map(q => q.materialId).filter(Boolean) as string[];

      setQuizSession({
        questions,
        currentIndex: 0,
        answers: [],
        startTime: Date.now(),
        questionStartTime: Date.now(),
        sessionId,
        materialIds,
      });
      setIsLoading(false);
      setView('quiz');
    } catch (err) {
      console.error('Session start error:', err);
      setErrorType('generic');
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setIsLoading(false);
      setView('select');
    }
  }, [selectedQuizTypes, useFlashCards, conversationScenarioId]);

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

  // Handle quiz answer submission
  const handleQuizSubmit = useCallback(async () => {
    if (!quizSession) return;
    
    const question = quizSession.questions[quizSession.currentIndex];
    const timeSpent = Date.now() - quizSession.questionStartTime;
    
    let userAnswer: string;
    let correctAnswer: string;
    let acceptableAnswers: string[] = [];

    switch (question.type) {
      case 'multiple_choice':
        userAnswer = selectedAnswer || '';
        correctAnswer = question.options[question.correctIndex];
        break;
      case 'true_false':
        userAnswer = selectedAnswer || '';
        correctAnswer = question.isTrue ? 'true' : 'false';
        break;
      case 'fill_blank':
        userAnswer = fillAnswer;
        correctAnswer = question.answer;
        acceptableAnswers = question.acceptableAnswers || [];
        break;
      default:
        return;
    }

    try {
      const response = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType: question.type,
          userAnswer,
          correctAnswer,
          acceptableAnswers,
          materialId: question.materialId,
        }),
      });

      const result = await response.json();
      
      setQuestionFeedback({
        isCorrect: result.isCorrect,
        feedback: result.feedback || (result.isCorrect ? 'Correct!' : `Not quite. ${question.explanation}`),
        score: result.score,
      });
      setShowFeedback(true);

      // Update session
      setQuizSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          answers: [
            ...prev.answers,
            {
              isCorrect: result.isCorrect,
              userAnswer,
              feedback: result.feedback,
              timeSpent,
            },
          ],
        };
      });
    } catch (err) {
      console.error('Answer submission error:', err);
      // Still show feedback based on local check
      const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
      setQuestionFeedback({
        isCorrect,
        feedback: isCorrect ? 'Correct!' : `The correct answer was: ${correctAnswer}`,
        score: isCorrect ? 1 : 0,
      });
      setShowFeedback(true);
    }
  }, [quizSession, selectedAnswer, fillAnswer]);

  // Continue to next quiz question
  const handleQuizContinue = useCallback(async () => {
    if (!quizSession) return;
    
    if (quizSession.currentIndex >= quizSession.questions.length - 1) {
      // Session complete
      const correct = quizSession.answers.filter(a => a.isCorrect).length + (questionFeedback?.isCorrect ? 1 : 0);
      const incorrect = quizSession.answers.filter(a => !a.isCorrect).length + (questionFeedback?.isCorrect ? 0 : 1);
      const total = quizSession.questions.length;
      const duration = Math.floor((Date.now() - quizSession.startTime) / 1000);

      try {
        // Update session with results
        await fetch(`/api/learning-sessions/${quizSession.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialsCovered: quizSession.materialIds,
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

        // Show feedback
        setFeedbackData({
          totalXP: correct * 5, // Estimate XP
          correct,
          incorrect,
          total,
          duration,
        });
        setView('feedback');
      } catch (err) {
        console.error('Session completion error:', err);
        setFeedbackData({
          totalXP: correct * 5,
          correct,
          incorrect,
          total,
          duration,
        });
        setView('feedback');
      }
      return;
    }

    setQuizSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        questionStartTime: Date.now(),
      };
    });
    setSelectedAnswer(null);
    setFillAnswer('');
    setShowFeedback(false);
    setQuestionFeedback(null);
  }, [quizSession, questionFeedback]);

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

          // Show feedback instead of redirecting immediately
          setFeedbackData({
            totalXP,
            correct,
            incorrect,
            total: session.cards.length,
            duration,
          });
          setView('feedback');
        } catch (err) {
          console.error('Session completion error:', err);
          // Still show feedback even if update fails
          setFeedbackData({
            totalXP,
            correct,
            incorrect,
            total: session.cards.length,
            duration,
          });
          setView('feedback');
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
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Review Mode</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how you want to review your vocabulary
            </p>
            
            {/* Flash Cards Option */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setUseFlashCards(!useFlashCards);
                  if (!useFlashCards) {
                    setSelectedQuizTypes([]);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  useFlashCards
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${useFlashCards ? 'text-primary' : 'text-muted-foreground'}`}>
                    {useFlashCards ? (
                      <LuCheckCircle className="w-5 h-5" />
                    ) : (
                      <LuCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <LuBook className={`w-5 h-5 ${useFlashCards ? 'text-primary' : 'text-muted-foreground'}`} />
                      <h4 className={`font-semibold ${useFlashCards ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Flash Cards
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Review with traditional flash cards - reveal answers and rate your knowledge
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Quiz Types (only if flash cards not selected) */}
            {!useFlashCards && (
              <QuizTypeSelector
                onSelect={setSelectedQuizTypes}
                defaultTypes={selectedQuizTypes}
                disabled={isLoading}
              />
            )}
          </div>
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
            disabled={isLoading || (!useFlashCards && selectedQuizTypes.length === 0)}
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

  // No cards to review (only for flash card mode)
  if (view === 'review' && (!session || session.cards.length === 0)) {
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

  // Feedback view
  if (view === 'feedback' && feedbackData) {
    const accuracy = feedbackData.total > 0 
      ? Math.round((feedbackData.correct / feedbackData.total) * 100) 
      : 0;
    const minutes = Math.floor(feedbackData.duration / 60);
    const seconds = feedbackData.duration % 60;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <span className="flex justify-center mb-4">
            <PiConfetti className="w-14 h-14 text-primary" />
          </span>
          <h1 className="text-3xl font-bold mb-2">Review Complete!</h1>
          <p className="text-muted-foreground">
            Great job! You&apos;ve reviewed {feedbackData.total} cards.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <div className="text-2xl font-bold text-green-600">{feedbackData.correct}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <div className="text-2xl font-bold text-orange-600">{feedbackData.incorrect}</div>
            <div className="text-sm text-muted-foreground">Needs Review</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <div className="text-2xl font-bold text-primary">{accuracy}%</div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <div className="text-2xl font-bold text-blue-600">+{feedbackData.totalXP}</div>
            <div className="text-sm text-muted-foreground">XP Earned</div>
          </div>
        </div>

        {/* Time */}
        <div className="bg-card border border-border rounded-xl p-4 mb-8 text-center">
          <div className="text-sm text-muted-foreground mb-1">Time Spent</div>
          <div className="text-lg font-semibold">
            {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              setView('select');
              setSession(null);
              setQuizSession(null);
              setFeedbackData(null);
              setSelectedAnswer(null);
              setFillAnswer('');
              setShowFeedback(false);
              setQuestionFeedback(null);
            }}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Review More
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Quiz question view
  if (view === 'quiz' && quizSession) {
    const question = quizSession.questions[quizSession.currentIndex];
    const progress = ((quizSession.currentIndex + 1) / quizSession.questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span className="font-medium">Question {quizSession.currentIndex + 1} of {quizSession.questions.length}</span>
            <span className="text-green-600 dark:text-green-400 font-semibold">{quizSession.answers.filter(a => a.isCorrect).length} correct</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          {question.type === 'multiple_choice' && (
            <MultipleChoiceCard
              question={question}
              selectedAnswer={selectedAnswer}
              onSelect={setSelectedAnswer}
              showFeedback={showFeedback}
            />
          )}
          {question.type === 'true_false' && (
            <TrueFalseCard
              question={question}
              selectedAnswer={selectedAnswer}
              onSelect={setSelectedAnswer}
              showFeedback={showFeedback}
            />
          )}
          {question.type === 'fill_blank' && (
            <FillBlankCard
              question={question}
              answer={fillAnswer}
              onAnswerChange={setFillAnswer}
              showFeedback={showFeedback}
            />
          )}
        </div>

        {/* Feedback */}
        {showFeedback && questionFeedback && (
          <div
            className={`p-4 rounded-xl mb-6 ${
              questionFeedback.isCorrect
                ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
            }`}
          >
            {questionFeedback.feedback}
          </div>
        )}

        {/* Action button */}
        {!showFeedback ? (
          <button
            onClick={handleQuizSubmit}
            disabled={
              (question.type === 'fill_blank' && !fillAnswer.trim()) ||
              (question.type !== 'fill_blank' && !selectedAnswer)
            }
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleQuizContinue}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            {quizSession.currentIndex >= quizSession.questions.length - 1 ? 'Finish' : 'Continue'}
          </button>
        )}
      </div>
    );
  }

  // Session complete (handled in useEffect)
  if (session && session.currentIndex >= session.cards.length && view === 'review') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Saving progress and updating memory...</p>
        </div>
      </div>
    );
  }

  // Safety check - should not happen but ensures TypeScript safety
  if (!session) {
    return null;
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

// Multiple Choice Question Component
function MultipleChoiceCard({
  question,
  selectedAnswer,
  onSelect,
  showFeedback,
}: {
  question: MultipleChoiceQuestion;
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
  showFeedback: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = index === question.correctIndex;
          
          let bgClass = 'bg-muted/50 hover:bg-muted';
          if (showFeedback) {
            if (isCorrect) {
              bgClass = 'bg-green-500/20 border-green-500';
            } else if (isSelected && !isCorrect) {
              bgClass = 'bg-red-500/20 border-red-500';
            }
          } else if (isSelected) {
            bgClass = 'bg-primary/10 border-primary';
          }

          return (
            <button
              key={index}
              onClick={() => !showFeedback && onSelect(option)}
              disabled={showFeedback}
              className={`w-full p-4 rounded-xl border-2 border-transparent text-left transition-all ${bgClass}`}
            >
              <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// True/False Question Component
function TrueFalseCard({
  question,
  selectedAnswer,
  onSelect,
  showFeedback,
}: {
  question: TrueFalseQuestion;
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
  showFeedback: boolean;
}) {
  const correctAnswer = question.isTrue ? 'true' : 'false';

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">True or False?</div>
      <h2 className="text-xl font-semibold mb-6">{question.statement}</h2>
      <div className="grid grid-cols-2 gap-4">
        {['true', 'false'].map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === correctAnswer;
          
          let bgClass = 'bg-muted/50 hover:bg-muted';
          if (showFeedback) {
            if (isCorrect) {
              bgClass = 'bg-green-500/20 border-green-500';
            } else if (isSelected && !isCorrect) {
              bgClass = 'bg-red-500/20 border-red-500';
            }
          } else if (isSelected) {
            bgClass = 'bg-primary/10 border-primary';
          }

          return (
            <button
              key={option}
              onClick={() => !showFeedback && onSelect(option)}
              disabled={showFeedback}
              className={`p-6 rounded-xl border-2 border-transparent text-center font-semibold text-lg transition-all ${bgClass}`}
            >
              {option === 'true' ? '✓ True' : '✗ False'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Fill in the Blank Question Component
function FillBlankCard({
  question,
  answer,
  onAnswerChange,
  showFeedback,
}: {
  question: FillBlankQuestion;
  answer: string;
  onAnswerChange: (answer: string) => void;
  showFeedback: boolean;
}) {
  const parts = question.sentence.split('{{blank}}');

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">Fill in the blank</div>
      <div className="text-xl mb-6">
        {parts[0]}
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={showFeedback}
          placeholder="..."
          className={`inline-block w-32 mx-1 px-3 py-1 rounded-lg border-2 text-center font-semibold ${
            showFeedback
              ? answer.toLowerCase() === question.answer.toLowerCase()
                ? 'bg-green-500/20 border-green-500'
                : 'bg-red-500/20 border-red-500'
              : 'border-primary/50 focus:border-primary'
          } outline-none`}
        />
        {parts[1]}
      </div>
      {question.hint && !showFeedback && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Hint:</span> {question.hint}
        </p>
      )}
      {showFeedback && answer.toLowerCase() !== question.answer.toLowerCase() && (
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium">Correct answer:</span> {question.answer}
        </p>
      )}
    </div>
  );
}
