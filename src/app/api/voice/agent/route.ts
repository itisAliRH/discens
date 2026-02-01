import { NextResponse } from 'next/server';
import { createUntypedServerClient } from '@/lib/supabase/server-untyped';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/convai/agents/create';

// Voice options for different languages and styles
const VOICES = {
  de: {
    male_professional: '2EiwWnXFnvU5JabPnv8n', // Adam
    female_friendly: '21m00Tcm4TlvDq8ikWAM', // Rachel
    male_casual: 'ErXwobaYiN019PkySvjV', // Antoni
    female_professional: 'EXAVITQu4vr4xnSDxMaL', // Bella
  },
  en: {
    male_professional: '2EiwWnXFnvU5JabPnv8n', // Adam
    female_friendly: '21m00Tcm4TlvDq8ikWAM', // Rachel
    male_casual: 'ErXwobaYiN019PkySvjV', // Antoni
    female_professional: 'EXAVITQu4vr4xnSDxMaL', // Bella
  }
};

const DEFAULT_VOICE_ID = VOICES.de.female_friendly;

interface CreateAgentRequest {
  scenarioName: string;
  scenarioDescription: string;
  environment: string;
  targetLanguage: string;
  customPrompt?: string;
  voiceId?: string;
}

// In-memory cache for agent reuse (key: config hash, value: { agentId, expiresAt })
const agentCache = new Map<string, { agentId: string; signedUrl: string; expiresAt: number }>();

// Helper to create cache key
function createCacheKey(config: CreateAgentRequest): string {
  const key = `${config.scenarioName}-${config.scenarioDescription}-${config.environment}-${config.targetLanguage}-${config.voiceId || DEFAULT_VOICE_ID}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
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
      voiceId,
    } = body;

    const languageName = targetLanguage === 'de' ? 'German' : 'English';
    const nativeLanguageName = profile?.native_language === 'de' ? 'German' : 'English';

    // Check cache first
    const cacheKey = createCacheKey(body);
    const cached = agentCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('Returning cached agent:', cached.agentId);
      return NextResponse.json({
        agentId: cached.agentId,
        signedUrl: cached.signedUrl,
        scenarioName,
        environment,
        cached: true,
      });
    }

    // Select voice
    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

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
            voice_id: selectedVoiceId,
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
    const agentId = data.agent_id;

    // Get signed URL for authenticated WebSocket connection
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!signedUrlResponse.ok) {
      console.error('Failed to get signed URL');
      return NextResponse.json(
        { error: 'Failed to get signed URL for agent' },
        { status: 500 }
      );
    }

    const signedUrlData = await signedUrlResponse.json();
    const signedUrl = signedUrlData.signed_url;

    // Cache the agent for 1 hour
    agentCache.set(cacheKey, {
      agentId,
      signedUrl,
      expiresAt: Date.now() + 3600000, // 1 hour
    });

    return NextResponse.json({
      agentId,
      signedUrl,
      scenarioName,
      environment,
      cached: false,
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

/**
 * DELETE /api/voice/agent
 * Delete a dynamically created ElevenLabs agent
 */
export async function DELETE(request: Request) {
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

    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // Delete the agent via ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs agent deletion error:', errorData);
      // Don't fail if agent doesn't exist or already deleted
      if (response.status === 404) {
        return NextResponse.json({ message: 'Agent already deleted' });
      }
      return NextResponse.json(
        { error: 'Failed to delete voice agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Voice agent deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
