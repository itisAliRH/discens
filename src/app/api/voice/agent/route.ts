import { NextResponse } from 'next/server';
import { createUntypedServerClient } from '@/lib/supabase/server-untyped';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/convai/agents/create';

// Default voice ID for German language (you can change this)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - clear and professional

interface CreateAgentRequest {
  scenarioName: string;
  scenarioDescription: string;
  environment: string;
  targetLanguage: string;
  customPrompt?: string;
}

/**
 * POST /api/voice/agent
 * Create a custom ElevenLabs agent for a specific scenario
 */
export async function POST(request: Request) {
  try {
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const supabase = await createUntypedServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile for language preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language, native_language')
      .eq('id', user.id)
      .single();

    const body: CreateAgentRequest = await request.json();
    const {
      scenarioName,
      scenarioDescription,
      environment,
      targetLanguage = profile?.target_language || 'de',
      customPrompt,
    } = body;

    const languageName = targetLanguage === 'de' ? 'German' : 'English';
    const nativeLanguageName = profile?.native_language === 'de' ? 'German' : 'English';

    // Build the system prompt for the agent
    const systemPrompt = customPrompt || buildScenarioPrompt({
      scenarioName,
      scenarioDescription,
      environment,
      languageName,
      nativeLanguageName,
    });

    // Build the first message based on scenario
    const firstMessage = buildFirstMessage(scenarioName, scenarioDescription, languageName);

    // Create the agent via ElevenLabs API
    const response = await fetch(ELEVENLABS_API_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Discens - ${scenarioName} - ${user.id.slice(0, 8)}`,
        conversation_config: {
          agent: {
            first_message: firstMessage,
            language: targetLanguage,
            prompt: {
              prompt: systemPrompt,
              llm: 'gpt-4o-mini',
              temperature: 0.7,
              max_tokens: 500,
            },
          },
          tts: {
            voice_id: DEFAULT_VOICE_ID,
            model_id: 'eleven_turbo_v2_5',
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs agent creation error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create voice agent' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      agentId: data.agent_id,
      scenarioName,
      environment,
    });
  } catch (error) {
    console.error('Voice agent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildScenarioPrompt({
  scenarioName,
  scenarioDescription,
  environment,
  languageName,
  nativeLanguageName,
}: {
  scenarioName: string;
  scenarioDescription: string;
  environment: string;
  languageName: string;
  nativeLanguageName: string;
}): string {
  const environmentContext = getEnvironmentContext(environment);

  return `You are a language learning conversation partner helping someone practice ${languageName}. Their native language is ${nativeLanguageName}.

## Your Role
You are playing a character in this scenario: "${scenarioName}"
${scenarioDescription}

## Environment
${environmentContext}

## Guidelines
1. ALWAYS speak in ${languageName} - this is a language learning exercise
2. Speak naturally as your character would in this situation
3. Use vocabulary and phrases appropriate for the scenario
4. Keep responses conversational and realistic (2-4 sentences typically)
5. If the learner makes mistakes, continue the conversation naturally - don't correct them mid-conversation
6. Adjust your language complexity based on how the learner responds
7. Stay in character throughout the conversation
8. Use common phrases and expressions a native speaker would use in this situation

## Important
- Be patient and encouraging
- If the learner seems stuck, gently guide them with questions
- Make the conversation feel authentic and immersive
- Remember: you're helping them practice real-world ${languageName} communication`;
}

function buildFirstMessage(scenarioName: string, scenarioDescription: string, languageName: string): string {
  // Generate contextual first messages based on scenario type
  const scenarioLower = scenarioName.toLowerCase();
  
  if (languageName === 'German') {
    if (scenarioLower.includes('cafe') || scenarioLower.includes('coffee')) {
      return 'Guten Tag! Willkommen im Café. Was darf es sein?';
    }
    if (scenarioLower.includes('doctor') || scenarioLower.includes('health')) {
      return 'Guten Tag, ich bin Dr. Müller. Was führt Sie heute zu mir?';
    }
    if (scenarioLower.includes('shop') || scenarioLower.includes('store')) {
      return 'Guten Tag! Kann ich Ihnen helfen?';
    }
    if (scenarioLower.includes('restaurant')) {
      return 'Guten Abend! Herzlich willkommen. Haben Sie reserviert?';
    }
    if (scenarioLower.includes('landlord') || scenarioLower.includes('apartment')) {
      return 'Hallo! Schön, dass Sie sich für die Wohnung interessieren. Kommen Sie herein!';
    }
    if (scenarioLower.includes('work') || scenarioLower.includes('office') || scenarioLower.includes('colleague')) {
      return 'Hallo! Wie geht es dir heute? Hast du schon von dem neuen Projekt gehört?';
    }
    // Default German greeting
    return 'Guten Tag! Wie kann ich Ihnen helfen?';
  }
  
  // English defaults
  if (scenarioLower.includes('cafe') || scenarioLower.includes('coffee')) {
    return 'Hi there! Welcome to the café. What can I get for you today?';
  }
  if (scenarioLower.includes('doctor') || scenarioLower.includes('health')) {
    return 'Hello, I\'m Dr. Smith. What brings you in today?';
  }
  if (scenarioLower.includes('shop') || scenarioLower.includes('store')) {
    return 'Hello! Can I help you find something?';
  }
  // Default English greeting
  return 'Hello! How can I help you today?';
}

function getEnvironmentContext(environment: string): string {
  const contexts: Record<string, string> = {
    cafe: 'You are in a cozy café. There\'s soft background music, the smell of fresh coffee, and the gentle hum of other customers chatting.',
    office: 'You are in a modern office environment. There\'s the sound of keyboards typing and occasional phone calls in the background.',
    restaurant: 'You are in a restaurant. There\'s the clinking of dishes, quiet conversations, and occasional kitchen sounds.',
    hospital: 'You are in a medical clinic. The environment is calm and professional with quiet hallways.',
    street: 'You are on a city street. There\'s traffic noise, pedestrians walking by, and typical urban sounds.',
    train_station: 'You are at a train station. There are announcements over the speakers, trains arriving and departing, and travelers with luggage.',
    airport: 'You are at an airport. There are flight announcements, rolling luggage, and the bustle of travelers.',
    park: 'You are in a peaceful park. Birds are singing, there\'s a gentle breeze, and people are enjoying the outdoors.',
    home: 'You are in a comfortable home setting. It\'s quiet and relaxed.',
    supermarket: 'You are in a supermarket. There are shopping carts, beeping registers, and occasional announcements.',
    library: 'You are in a quiet library. People speak in whispers and there\'s the soft sound of pages turning.',
    none: 'The environment is neutral.',
  };
  
  return contexts[environment] || contexts.none;
}
