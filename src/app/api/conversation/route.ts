import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/providers';

export const runtime = 'edge';

// Conversation scenarios
const SCENARIOS = {
  cafe: {
    name: 'At the Café',
    description: 'Order coffee and pastries',
    aiRole: 'a friendly barista at a German café',
    userGoal: 'Order a coffee and something to eat',
    vocabulary: ['Kaffee', 'Tee', 'Kuchen', 'Croissant', 'Milch', 'Zucker'],
  },
  doctor: {
    name: 'Doctor\'s Office',
    description: 'Describe symptoms and understand advice',
    aiRole: 'a patient German doctor',
    userGoal: 'Describe your symptoms and get advice',
    vocabulary: ['Schmerzen', 'Kopfschmerzen', 'Fieber', 'Medikament', 'Rezept'],
  },
  shopping: {
    name: 'Shopping',
    description: 'Buy clothes and ask about sizes',
    aiRole: 'a helpful sales assistant at a clothing store',
    userGoal: 'Find and buy a piece of clothing',
    vocabulary: ['Größe', 'Farbe', 'Preis', 'Anprobieren', 'Kasse'],
  },
  landlord: {
    name: 'Meeting the Landlord',
    description: 'Discuss apartment issues',
    aiRole: 'your German landlord',
    userGoal: 'Report a problem with your apartment',
    vocabulary: ['Wohnung', 'Heizung', 'Miete', 'Reparatur', 'Schlüssel'],
  },
  work: {
    name: 'At Work',
    description: 'Discuss a project with a colleague',
    aiRole: 'a German coworker',
    userGoal: 'Discuss a work project and make plans',
    vocabulary: ['Projekt', 'Meeting', 'Deadline', 'Team', 'Bericht'],
  },
};

export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioId, messages, isStart, customDescription } = body as {
      scenarioId: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      isStart?: boolean;
      customDescription?: string;
    };

    // Handle custom scenarios
    let scenario: typeof SCENARIOS[keyof typeof SCENARIOS] | null = null;
    let scenarioName = '';
    let aiRole = '';
    let userGoal = '';
    let vocabulary: string[] = [];

    if (scenarioId === 'custom' && customDescription) {
      scenarioName = 'Custom Scenario';
      aiRole = 'a helpful conversation partner in the described situation';
      userGoal = customDescription;
      vocabulary = [];
    } else {
      scenario = SCENARIOS[scenarioId as keyof typeof SCENARIOS];
      if (!scenario) {
        return NextResponse.json({ error: 'Invalid scenario' }, { status: 400 });
      }
      scenarioName = scenario.name;
      aiRole = scenario.aiRole;
      userGoal = scenario.userGoal;
      vocabulary = scenario.vocabulary;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language')
      .eq('id', user.id)
      .single();

    const targetLanguage = profile?.target_language || 'de';
    const languageName = targetLanguage === 'de' ? 'German' : 'English';

    // Build system prompt
    const systemPrompt = `You are ${aiRole} in a language learning conversation scenario.

Rules:
1. Speak primarily in ${languageName}, keeping it simple and clear
2. Be patient and encouraging with the learner
3. If the user makes grammar mistakes, CONTINUE THE CONVERSATION NATURALLY - don't correct them mid-conversation
4. Respond naturally as the character would
5. Keep responses concise (1-3 sentences)
6. Use vocabulary appropriate for intermediate learners
7. If the user responds in English, gently encourage them to try in ${languageName}

Scenario: "${scenarioName}"
User's goal/situation: ${userGoal}
${vocabulary.length > 0 ? `Helpful vocabulary: ${vocabulary.join(', ')}` : ''}

${isStart ? `Start the conversation naturally in the described situation. Greet the user and set the scene.` : ''}`;

    // Generate response
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const aiResponse = completion.choices[0].message.content || '';

    return NextResponse.json({
      response: aiResponse,
      scenario: {
        name: scenarioName,
        description: scenario?.description || customDescription || '',
        vocabulary: vocabulary,
      },
    });
  } catch (error) {
    console.error('Conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return available scenarios
  return NextResponse.json({
    scenarios: Object.entries(SCENARIOS).map(([id, scenario]) => ({
      id,
      name: scenario.name,
      description: scenario.description,
      vocabulary: scenario.vocabulary,
    })),
  });
}
