import OpenAI from 'openai';
import { z } from 'zod';
import type { QuizType } from '@/types/database';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// QUIZ SCHEMAS
// ============================================

const MultipleChoiceQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(3).max(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
  materialId: z.string().optional(),
});

const TrueFalseQuestionSchema = z.object({
  statement: z.string(),
  isTrue: z.boolean(),
  explanation: z.string(),
  materialId: z.string().optional(),
});

const FillBlankQuestionSchema = z.object({
  sentence: z.string(), // Contains {{blank}} placeholder
  answer: z.string(),
  hint: z.string().optional(),
  acceptableAnswers: z.array(z.string()).optional(),
  explanation: z.string(),
  materialId: z.string().optional(),
});

const QuizBatchSchema = z.object({
  multipleChoice: z.array(MultipleChoiceQuestionSchema).optional(),
  trueFalse: z.array(TrueFalseQuestionSchema).optional(),
  fillBlank: z.array(FillBlankQuestionSchema).optional(),
});

export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestionSchema>;
export type TrueFalseQuestion = z.infer<typeof TrueFalseQuestionSchema>;
export type FillBlankQuestion = z.infer<typeof FillBlankQuestionSchema>;
export type QuizBatch = z.infer<typeof QuizBatchSchema>;

// ============================================
// QUIZ GENERATION
// ============================================

interface Material {
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
}

interface GenerateQuizOptions {
  materials: Material[];
  quizTypes: QuizType[];
  count: number;
  targetLanguage: 'en' | 'de';
  nativeLanguage: 'en' | 'de';
  isReview?: boolean;
  difficultyBoost?: number; // -1 to 1, to make questions easier/harder
}

/**
 * Generate quiz questions from learning materials using OpenAI
 */
export async function generateQuiz(options: GenerateQuizOptions): Promise<{
  success: boolean;
  questions: QuizBatch | null;
  error?: string;
}> {
  const {
    materials,
    quizTypes,
    count,
    targetLanguage,
    nativeLanguage,
    isReview = false,
    difficultyBoost = 0,
  } = options;

  const languageName = targetLanguage === 'de' ? 'German' : 'English';
  const nativeLanguageName = nativeLanguage === 'de' ? 'German' : 'English';

  // Determine what types of questions to generate
  const quizTypeDistribution: Record<string, number> = {};
  const availableTypes = quizTypes.filter(t => ['multiple_choice', 'true_false', 'fill_blank'].includes(t));
  
  if (availableTypes.length === 0) {
    // Default distribution
    quizTypeDistribution['multiple_choice'] = Math.ceil(count * 0.4);
    quizTypeDistribution['true_false'] = Math.ceil(count * 0.3);
    quizTypeDistribution['fill_blank'] = Math.floor(count * 0.3);
  } else {
    const perType = Math.ceil(count / availableTypes.length);
    availableTypes.forEach(t => {
      quizTypeDistribution[t] = perType;
    });
  }

  const systemPrompt = `You are a language learning quiz generator for ${languageName} learners whose native language is ${nativeLanguageName}.
Generate ${isReview ? 'review' : 'learning'} questions based on the provided materials.

Guidelines:
- Questions should test comprehension, not just memorization
- For German: test articles, cases, and word order
- Include varied question styles
- ${isReview ? 'Focus on reinforcing previously learned material' : 'Help introduce new vocabulary/concepts'}
- Difficulty adjustment: ${difficultyBoost > 0 ? 'Make questions slightly harder' : difficultyBoost < 0 ? 'Make questions slightly easier' : 'Normal difficulty'}`;

  const userPrompt = `Generate quiz questions from these materials:

${JSON.stringify(materials.map(m => ({
  id: m.id,
  type: m.type,
  content: m.content,
})), null, 2)}

Generate approximately:
- ${quizTypeDistribution['multiple_choice'] || 0} multiple choice questions
- ${quizTypeDistribution['true_false'] || 0} true/false questions  
- ${quizTypeDistribution['fill_blank'] || 0} fill-in-the-blank questions

Return JSON:
{
  "multipleChoice": [{
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Why this is correct",
    "materialId": "associated material ID"
  }],
  "trueFalse": [{
    "statement": "Statement to evaluate",
    "isTrue": true/false,
    "explanation": "Why this is true/false",
    "materialId": "associated material ID"
  }],
  "fillBlank": [{
    "sentence": "The {{blank}} is blue.",
    "answer": "sky",
    "hint": "Something above us",
    "acceptableAnswers": ["sky", "ocean"],
    "explanation": "Explanation",
    "materialId": "associated material ID"
  }]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const parsed = JSON.parse(content);
    const validated = QuizBatchSchema.parse(parsed);

    return {
      success: true,
      questions: validated,
    };
  } catch (error) {
    console.error('Quiz generation error:', error);
    
    // Retry with GPT-4o if gpt-4o-mini fails
    try {
      const retryResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = retryResponse.choices[0].message.content;
      if (content) {
        const parsed = JSON.parse(content);
        const validated = QuizBatchSchema.parse(parsed);
        return { success: true, questions: validated };
      }
    } catch (retryError) {
      console.error('Retry with GPT-4o failed:', retryError);
    }

    return {
      success: false,
      questions: null,
      error: error instanceof Error ? error.message : 'Failed to generate quiz',
    };
  }
}

// ============================================
// ANSWER EVALUATION
// ============================================

interface EvaluateAnswerOptions {
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank' | 'free_text';
  userAnswer: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  targetLanguage: 'en' | 'de';
}

const AnswerEvaluationSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number().min(0).max(1), // 0 = wrong, 1 = correct, 0.5 = partially correct
  feedback: z.string(),
  correction: z.string().optional(),
  mistakeType: z.string().optional(),
});

/**
 * Evaluate a user's answer with AI assistance for nuanced checking
 */
export async function evaluateAnswer(options: EvaluateAnswerOptions): Promise<{
  success: boolean;
  isCorrect: boolean;
  score: number;
  feedback: string;
  correction?: string;
  mistakeType?: string;
}> {
  const { questionType, userAnswer, correctAnswer, acceptableAnswers = [], targetLanguage } = options;

  // Quick check for exact matches
  const normalizedUser = userAnswer.toLowerCase().trim();
  const normalizedCorrect = correctAnswer.toLowerCase().trim();
  const allAcceptable = [normalizedCorrect, ...acceptableAnswers.map(a => a.toLowerCase().trim())];

  if (allAcceptable.includes(normalizedUser)) {
    return {
      success: true,
      isCorrect: true,
      score: 1,
      feedback: 'Correct! 🎉',
    };
  }

  // For fill-in-the-blank and free text, use AI for fuzzy matching
  if (questionType === 'fill_blank' || questionType === 'free_text') {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Evaluate this ${targetLanguage === 'de' ? 'German' : 'English'} language learning answer.

User's answer: "${userAnswer}"
Correct answer: "${correctAnswer}"
Other acceptable answers: ${acceptableAnswers.join(', ') || 'None'}

Consider:
- Minor spelling mistakes
- Case sensitivity (for German)
- Article variations
- Word order if applicable

Return JSON:
{
  "isCorrect": boolean,
  "score": 0-1 (0=wrong, 0.5=partially, 1=correct),
  "feedback": "Encouraging feedback for the learner",
  "correction": "Corrected version if wrong",
  "mistakeType": "article|spelling|case|word_order|vocabulary|other or null if correct"
}`,
        }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 300,
      });

      const content = response.choices[0].message.content;
      if (content) {
        const result = AnswerEvaluationSchema.parse(JSON.parse(content));
        return { success: true, ...result };
      }
    } catch (error) {
      console.error('Answer evaluation error:', error);
    }
  }

  // Default: wrong answer
  return {
    success: true,
    isCorrect: false,
    score: 0,
    feedback: `Not quite! The correct answer is: ${correctAnswer}`,
    correction: correctAnswer,
  };
}

// ============================================
// SESSION FEEDBACK
// ============================================

const SessionFeedbackSchema = z.object({
  overallScore: z.number().min(0).max(100),
  message: z.string(),
  strengths: z.array(z.string()),
  areasToImprove: z.array(z.string()),
  recommendations: z.array(z.string()),
  xpEarned: z.number().min(0),
});

interface SessionResult {
  correct: number;
  incorrect: number;
  skipped: number;
  totalTime: number;
  mistakes: Array<{ type: string; pattern: string }>;
}

/**
 * Generate personalized feedback for a completed session
 */
export async function generateSessionFeedback(
  sessionResult: SessionResult,
  isReview: boolean
): Promise<z.infer<typeof SessionFeedbackSchema>> {
  const total = sessionResult.correct + sessionResult.incorrect + sessionResult.skipped;
  const accuracy = total > 0 ? (sessionResult.correct / total) * 100 : 0;
  const baseXP = sessionResult.correct * (isReview ? 5 : 10);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Generate encouraging feedback for this ${isReview ? 'review' : 'learning'} session.

Results:
- Correct: ${sessionResult.correct}/${total}
- Accuracy: ${accuracy.toFixed(1)}%
- Time: ${Math.round(sessionResult.totalTime / 60)} minutes
- Common mistakes: ${JSON.stringify(sessionResult.mistakes.slice(0, 5))}

Return JSON:
{
  "overallScore": ${Math.round(accuracy)},
  "message": "Personalized encouraging message",
  "strengths": ["strength1", "strength2"],
  "areasToImprove": ["area1", "area2"],
  "recommendations": ["What to do next"],
  "xpEarned": ${baseXP}
}`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (content) {
      return SessionFeedbackSchema.parse(JSON.parse(content));
    }
  } catch (error) {
    console.error('Feedback generation error:', error);
  }

  // Default feedback
  return {
    overallScore: Math.round(accuracy),
    message: accuracy >= 80 ? 'Great job! 🌟' : accuracy >= 50 ? 'Good effort! Keep practicing! 💪' : 'Keep at it! Practice makes perfect! 📚',
    strengths: sessionResult.correct > 0 ? ['Made progress'] : [],
    areasToImprove: sessionResult.incorrect > 0 ? ['Review missed items'] : [],
    recommendations: ['Continue with another session'],
    xpEarned: baseXP,
  };
}
