'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MultipleChoiceQuestion, TrueFalseQuestion, FillBlankQuestion, QuizBatch } from '@/lib/ai/quiz';

type Question = (MultipleChoiceQuestion & { type: 'multiple_choice' }) 
  | (TrueFalseQuestion & { type: 'true_false' }) 
  | (FillBlankQuestion & { type: 'fill_blank' });

interface SessionState {
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
}

export default function LearnPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    isCorrect: boolean;
    feedback: string;
    score: number;
  } | null>(null);

  // Fetch and start quiz
  useEffect(() => {
    async function loadQuiz() {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'learn/page.tsx:loadQuiz',message:'Starting quiz load',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      try {
        const response = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: 5,
            quizTypes: ['multiple_choice', 'fill_blank', 'true_false'],
            isReview: false,
          }),
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'learn/page.tsx:loadQuiz',message:'API response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        if (!response.ok) {
          const errorText = await response.text();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'learn/page.tsx:loadQuiz',message:'API error response',data:{errorText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          throw new Error('Failed to load quiz');
        }

        const data = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'learn/page.tsx:loadQuiz',message:'Quiz data received',data:{hasQuestions:!!data.questions,materialCount:data.materialCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const questions = flattenQuestions(data.questions);

        if (questions.length === 0) {
          setError('No materials available. Add some materials to your memory first!');
          setIsLoading(false);
          return;
        }

        // Shuffle questions
        const shuffled = questions.sort(() => Math.random() - 0.5);

        setSession({
          questions: shuffled,
          currentIndex: 0,
          answers: [],
          startTime: Date.now(),
          questionStartTime: Date.now(),
        });
        setIsLoading(false);
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'learn/page.tsx:loadQuiz',message:'Quiz load error',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
        setIsLoading(false);
      }
    }

    loadQuiz();
  }, []);

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

  // Handle answer submission
  const handleSubmit = useCallback(async () => {
    if (!session) return;
    
    const question = session.questions[session.currentIndex];
    const timeSpent = Date.now() - session.questionStartTime;
    
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
      
      setFeedbackData({
        isCorrect: result.isCorrect,
        feedback: result.feedback || (result.isCorrect ? 'Correct! 🎉' : `Not quite. ${question.explanation}`),
        score: result.score,
      });
      setShowFeedback(true);

      // Update session
      setSession(prev => {
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
      setFeedbackData({
        isCorrect,
        feedback: isCorrect ? 'Correct! 🎉' : `The correct answer was: ${correctAnswer}`,
        score: isCorrect ? 1 : 0,
      });
      setShowFeedback(true);
    }
  }, [session, selectedAnswer, fillAnswer]);

  // Continue to next question
  const handleContinue = useCallback(() => {
    if (!session) return;
    
    if (session.currentIndex >= session.questions.length - 1) {
      // Session complete - show results
      const correct = session.answers.filter(a => a.isCorrect).length + (feedbackData?.isCorrect ? 1 : 0);
      const total = session.questions.length;
      
      // Redirect to results (for now, just go back to dashboard)
      router.push(`/dashboard?learned=${correct}&total=${total}`);
      return;
    }

    setSession(prev => {
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
    setFeedbackData(null);
  }, [session, feedbackData, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Preparing your lesson...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <span className="text-6xl mb-4 block">😕</span>
          <h2 className="text-xl font-semibold mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const question = session.questions[session.currentIndex];
  const progress = ((session.currentIndex + 1) / session.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {session.currentIndex + 1} of {session.questions.length}</span>
          <span>{session.answers.filter(a => a.isCorrect).length} correct</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
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
      {showFeedback && feedbackData && (
        <div
          className={`p-4 rounded-xl mb-6 ${
            feedbackData.isCorrect
              ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          {feedbackData.feedback}
        </div>
      )}

      {/* Action button */}
      {!showFeedback ? (
        <button
          onClick={handleSubmit}
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
          onClick={handleContinue}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          {session.currentIndex >= session.questions.length - 1 ? 'Finish' : 'Continue'}
        </button>
      )}
    </div>
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
