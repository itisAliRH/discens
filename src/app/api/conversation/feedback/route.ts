import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FeedbackSchema = z.object({
  overallScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corrections: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    explanation: z.string(),
  })),
  newWordsLearned: z.array(z.string()),
  encouragement: z.string(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, scenarioName } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      scenarioName: string;
    };

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language')
      .eq('id', user.id)
      .single();

    const targetLanguage = profile?.target_language || 'de';
    const languageName = targetLanguage === 'de' ? 'German' : 'English';

    // Get only user messages
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);

    // Generate feedback
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly ${languageName} language tutor analyzing a conversation practice session.
          
The scenario was: "${scenarioName}"

Analyze the user's ${languageName} responses and provide constructive feedback.
Be encouraging but honest. Focus on practical improvements.

Return JSON:
{
  "overallScore": 0-100,
  "fluencyScore": 0-100,
  "grammarScore": 0-100,
  "vocabularyScore": 0-100,
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "corrections": [{"original": "what user said", "corrected": "correct version", "explanation": "why"}],
  "newWordsLearned": ["word1", "word2"],
  "encouragement": "A friendly, encouraging message"
}`,
        },
        {
          role: 'user',
          content: `Here are the user's messages during the conversation:\n\n${userMessages.join('\n\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No feedback generated');
    }

    const feedback = FeedbackSchema.parse(JSON.parse(content));

    // Save conversation session
    const { data: memory } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (memory) {
      await supabase.from('learning_sessions').insert({
        user_id: user.id,
        session_type: 'conversation',
        conversation_scenario: scenarioName,
        conversation_transcript: messages,
        correct_count: Math.round(feedback.overallScore / 20),
        incorrect_count: feedback.corrections.length,
        duration_seconds: 0, // Would need to track this client-side
        completed_at: new Date().toISOString(),
      });

      // Record mistakes
      for (const correction of feedback.corrections) {
        await supabase.from('mistakes').insert({
          user_id: user.id,
          mistake_type: 'grammar',
          pattern: correction.original,
          explanation: correction.explanation,
          examples: [{ incorrect: correction.original, correct: correction.corrected }],
        });
      }
    }

    // Award XP
    const xpEarned = Math.round(feedback.overallScore / 5) + 10;
    await supabase.rpc('increment_xp', { user_id: user.id, amount: xpEarned });

    return NextResponse.json({
      ...feedback,
      xpEarned,
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
