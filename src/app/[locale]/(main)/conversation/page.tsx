'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConversation } from '@elevenlabs/react';
import type { ReactNode } from 'react';
import {
  LuMessageCircle,
  LuVolumeX,
  LuCoffee,
  LuBuilding2,
  LuUtensils,
  LuStethoscope,
  LuCar,
  LuTrain,
  LuPlane,
  LuTrees,
  LuHouse,
  LuShoppingCart,
  LuLibrary,
  LuKeyboard,
  LuMic,
  LuSparkles,
  LuVolume2,
  LuTarget,
  LuPencil,
  LuClipboard,
} from '@/components/ui/icons';
import { FaTheaterMasks } from '@/components/ui/icons';
import { TbMuscle } from '@/components/ui/icons';
import { IoEarOutline } from '@/components/ui/icons';

// ===== Types =====

interface Scenario {
  id: string;
  name: string;
  description: string;
  vocabulary: string[];
  defaultEnvironment?: EnvironmentType;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Feedback {
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  strengths: string[];
  improvements: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  newWordsLearned: string[];
  encouragement: string;
  xpEarned: number;
}

interface SavedConversation {
  scenario: Scenario;
  messages: Message[];
  inputMode: InputMode;
  environment: EnvironmentType;
  timestamp: number;
}

type ViewState = 'select' | 'chat' | 'feedback';
type InputMode = 'text' | 'voice' | 'elevenlabs';

// ===== Environment/Ambiance Types =====

type EnvironmentType = 
  | 'none'
  | 'cafe'
  | 'office'
  | 'restaurant'
  | 'hospital'
  | 'street'
  | 'train_station'
  | 'airport'
  | 'park'
  | 'home'
  | 'supermarket'
  | 'library';

interface EnvironmentConfig {
  id: EnvironmentType;
  name: string;
  icon: ReactNode;
  description: string;
  // Using royalty-free ambient sound URLs (placeholders - would need actual hosted files)
  audioUrl?: string;
}

const ENVIRONMENTS: EnvironmentConfig[] = [
  { id: 'none', name: 'No Background', icon: <LuVolumeX className="w-5 h-5" />, description: 'Silent background' },
  { id: 'cafe', name: 'Café', icon: <LuCoffee className="w-5 h-5" />, description: 'Coffee shop chatter, espresso machines', audioUrl: '/audio/ambiance/cafe.mp3' },
  { id: 'office', name: 'Office', icon: <LuBuilding2 className="w-5 h-5" />, description: 'Keyboard typing, printer, quiet murmurs', audioUrl: '/audio/ambiance/office.mp3' },
  { id: 'restaurant', name: 'Restaurant', icon: <LuUtensils className="w-5 h-5" />, description: 'Dishes clinking, conversations, kitchen sounds', audioUrl: '/audio/ambiance/restaurant.mp3' },
  { id: 'hospital', name: 'Hospital', icon: <LuStethoscope className="w-5 h-5" />, description: 'Quiet hallways, distant announcements', audioUrl: '/audio/ambiance/hospital.mp3' },
  { id: 'street', name: 'City Street', icon: <LuCar className="w-5 h-5" />, description: 'Traffic, pedestrians, city sounds', audioUrl: '/audio/ambiance/street.mp3' },
  { id: 'train_station', name: 'Train Station', icon: <LuTrain className="w-5 h-5" />, description: 'Announcements, train sounds, crowd', audioUrl: '/audio/ambiance/train.mp3' },
  { id: 'airport', name: 'Airport', icon: <LuPlane className="w-5 h-5" />, description: 'Announcements, crowds, rolling luggage', audioUrl: '/audio/ambiance/airport.mp3' },
  { id: 'park', name: 'Park', icon: <LuTrees className="w-5 h-5" />, description: 'Birds singing, wind, nature sounds', audioUrl: '/audio/ambiance/park.mp3' },
  { id: 'home', name: 'Home', icon: <LuHouse className="w-5 h-5" />, description: 'Quiet indoor ambiance', audioUrl: '/audio/ambiance/home.mp3' },
  { id: 'supermarket', name: 'Supermarket', icon: <LuShoppingCart className="w-5 h-5" />, description: 'Shopping carts, beeping, announcements', audioUrl: '/audio/ambiance/supermarket.mp3' },
  { id: 'library', name: 'Library', icon: <LuLibrary className="w-5 h-5" />, description: 'Very quiet, page turns, whispers', audioUrl: '/audio/ambiance/library.mp3' },
];

const STORAGE_KEY = 'discens_conversation_state';

// Voice options
const VOICE_OPTIONS = [
  { id: 'female_friendly', name: 'Female (Friendly)', description: 'Rachel - Clear and professional' },
  { id: 'male_professional', name: 'Male (Professional)', description: 'Adam - Deep and authoritative' },
  { id: 'male_casual', name: 'Male (Casual)', description: 'Antoni - Warm and conversational' },
  { id: 'female_professional', name: 'Female (Professional)', description: 'Bella - Confident and articulate' },
];

function ConversationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewState>('select');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [customScenario, setCustomScenario] = useState('');
  const [customEnvironment, setCustomEnvironment] = useState<EnvironmentType>('none');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [savedConversation, setSavedConversation] = useState<SavedConversation | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentType>('none');
  const [showEnvironmentPicker, setShowEnvironmentPicker] = useState(false);
  const [ambianceVolume, setAmbianceVolume] = useState(0.3);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('female_friendly');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ambianceAudioRef = useRef<HTMLAudioElement | null>(null);

  // ElevenLabs conversation hook
  const elevenLabsConversation = useConversation({
    onConnect: () => {
      console.log('ElevenLabs connected');
    },
    onDisconnect: () => {
      console.log('ElevenLabs disconnected');
    },
    onMessage: (message) => {
      if (message.message) {
        const role = message.source === 'user' ? 'user' : 'assistant';
        setMessages(prev => {
          // Avoid duplicates
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === role && lastMsg?.content === message.message) {
            return prev;
          }
          return [...prev, { role, content: message.message }];
        });
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
    },
  });

  // ===== Effects =====

  // Load session from URL param on mount
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('session');
    if (sessionIdFromUrl) {
      setIsLoadingSession(true);
      fetch(`/api/conversation/sessions/${sessionIdFromUrl}`)
        .then(res => res.ok ? res.json() : Promise.reject('Session not found'))
        .then(data => {
          const session = data.session;
          setSessionId(session.id);
          setSelectedScenario({
            id: session.scenario_id,
            name: session.scenario_name,
            description: session.scenario_description || '',
            vocabulary: [],
            defaultEnvironment: session.environment as EnvironmentType,
          });
          setMessages(session.messages || []);
          setInputMode((session.input_mode || 'text') as InputMode);
          setSelectedEnvironment((session.environment || 'none') as EnvironmentType);
          
          // If completed, show feedback
          if (session.completed_at && session.feedback) {
            setFeedback(session.feedback);
            setView('feedback');
          } else if (session.messages && session.messages.length > 0) {
            setView('chat');
          }
          setIsLoadingSession(false);
        })
        .catch(() => {
          // Session not found, remove from URL
          router.replace('/conversation');
          setIsLoadingSession(false);
        });
    }
  }, [searchParams, router]);

  // Check for saved conversation on mount (only if no session from URL)
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('session');
    if (sessionIdFromUrl) return; // Skip if loading from URL
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: SavedConversation = JSON.parse(saved);
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && parsed.messages.length > 0) {
          setSavedConversation(parsed);
          setShowContinueDialog(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [searchParams]);

  // Save conversation state (to localStorage for quick access)
  useEffect(() => {
    if (view === 'chat' && selectedScenario && messages.length > 0) {
      const state: SavedConversation = {
        scenario: selectedScenario,
        messages,
        inputMode,
        environment: selectedEnvironment,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [view, selectedScenario, messages, inputMode, selectedEnvironment]);

  // Sync messages to database session
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      // Debounce updates to avoid too many requests
      const timeoutId = setTimeout(() => {
        fetch(`/api/conversation/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            environment: selectedEnvironment,
            inputMode,
          }),
        }).catch(console.error);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [sessionId, messages, selectedEnvironment, inputMode]);

  // Browser guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (view === 'chat' && messages.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have an active conversation. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view, messages]);

  // Fetch scenarios
  useEffect(() => {
    async function loadScenarios() {
      try {
        const response = await fetch('/api/conversation');
        if (response.ok) {
          const data = await response.json();
          // Add default environments to scenarios
          const scenariosWithEnv = data.scenarios.map((s: Scenario) => ({
            ...s,
            defaultEnvironment: getDefaultEnvironment(s.id),
          }));
          setScenarios(scenariosWithEnv);
        }
      } catch (error) {
        console.error('Failed to load scenarios:', error);
      }
    }
    loadScenarios();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Manage ambiance audio with auto-ducking when AI speaks
  useEffect(() => {
    if (view === 'chat' && selectedEnvironment !== 'none') {
      const env = ENVIRONMENTS.find(e => e.id === selectedEnvironment);
      if (env?.audioUrl && ambianceAudioRef.current) {
        ambianceAudioRef.current.src = env.audioUrl;
        // Auto-duck volume when AI is speaking
        const targetVolume = elevenLabsConversation.isSpeaking 
          ? ambianceVolume * 0.3  // Duck to 30% when AI speaks
          : ambianceVolume;
        ambianceAudioRef.current.volume = targetVolume;
        ambianceAudioRef.current.loop = true;
        ambianceAudioRef.current.play().catch(() => {
          // Autoplay might be blocked
        });
      }
    } else if (ambianceAudioRef.current) {
      ambianceAudioRef.current.pause();
    }

    return () => {
      if (ambianceAudioRef.current) {
        ambianceAudioRef.current.pause();
      }
    };
  }, [view, selectedEnvironment, ambianceVolume, elevenLabsConversation.isSpeaking]);

  // ===== Helper Functions =====

  function getDefaultEnvironment(scenarioId: string): EnvironmentType {
    const mapping: Record<string, EnvironmentType> = {
      cafe: 'cafe',
      doctor: 'hospital',
      shopping: 'supermarket',
      landlord: 'home',
      work: 'office',
      restaurant: 'restaurant',
    };
    return mapping[scenarioId] || 'none';
  }

  function getEnvironmentContext(environment: EnvironmentType): string {
    const contexts: Record<EnvironmentType, string> = {
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

  // ===== Conversation Functions =====

  const continueConversation = useCallback(() => {
    if (savedConversation) {
      setSelectedScenario(savedConversation.scenario);
      setMessages(savedConversation.messages);
      setInputMode(savedConversation.inputMode);
      setSelectedEnvironment(savedConversation.environment || 'none');
      setView('chat');
      setShowContinueDialog(false);
    }
  }, [savedConversation]);

  const startNewConversation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedConversation(null);
    setShowContinueDialog(false);
  }, []);

  const clearSavedConversation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedConversation(null);
  }, []);

  // Create a new database session for the conversation
  const createSession = useCallback(async (scenario: Scenario, environment: EnvironmentType): Promise<string | null> => {
    try {
      const response = await fetch('/api/conversation/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          scenarioDescription: scenario.description,
          environment,
          inputMode,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.session.id;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    return null;
  }, [inputMode]);

  // Build ElevenLabs prompt based on scenario
  const buildElevenLabsPrompt = useCallback((scenario: Scenario, environment: EnvironmentType): string => {
    const environmentContext = getEnvironmentContext(environment);
    
    return `You are a language learning conversation partner helping someone practice German. Their native language is English.

## Your Role
You are playing a character in this scenario: "${scenario.name}"
${scenario.description}

## Environment
${environmentContext}

## Guidelines
1. ALWAYS speak in German - this is a language learning exercise
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
- Remember: you're helping them practice real-world German communication`;
  }, []);

  // Build first message based on scenario
  const buildFirstMessage = useCallback((scenario: Scenario): string => {
    const scenarioLower = scenario.name.toLowerCase();
    
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
  }, []);

  // Start conversation with ElevenLabs or text mode
  const startConversation = useCallback(async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([]);
    const environment = scenario.defaultEnvironment || customEnvironment || 'none';
    setSelectedEnvironment(environment);
    setView('chat');
    setIsLoading(true);

    // Create session in database and update URL
    const newSessionId = await createSession(scenario, environment);
    if (newSessionId) {
      setSessionId(newSessionId);
      router.push(`/conversation?session=${newSessionId}`, { scroll: false });
    }

    if (inputMode === 'elevenlabs') {
      // Start ElevenLabs conversation with dynamically created agent
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create agent dynamically based on scenario and environment
        const agentResponse = await fetch('/api/voice/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioName: scenario.name,
            scenarioDescription: scenario.id === 'custom' ? customScenario : scenario.description,
            environment: environment,
            voiceId: selectedVoice,
          }),
        });

        if (!agentResponse.ok) {
          throw new Error('Failed to create agent');
        }

        const { agentId, signedUrl } = await agentResponse.json();
        setCurrentAgentId(agentId);
        
        // Start the ElevenLabs session with signed URL for authentication
        await elevenLabsConversation.startSession({
          signedUrl,
          connectionType: 'websocket',
        });
        
        // Build and add the first message to our local state
        const firstMessage = buildFirstMessage(scenario);
        setMessages([{ role: 'assistant', content: firstMessage }]);
      } catch (error) {
        console.error('Failed to start ElevenLabs conversation:', error);
        // Fall back to text mode
        setInputMode('text');
        try {
          const response = await fetch('/api/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenarioId: scenario.id,
              messages: [],
              isStart: true,
              customDescription: scenario.id === 'custom' ? customScenario : undefined,
              environment: environment,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            setMessages([{ role: 'assistant', content: data.response }]);
          }
        } catch (fallbackError) {
          console.error('Fallback to text mode also failed:', fallbackError);
        }
      }
      setIsLoading(false);
    } else {
      // Text-based conversation
      try {
        const response = await fetch('/api/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: scenario.id,
            messages: [],
            isStart: true,
            customDescription: scenario.id === 'custom' ? customScenario : undefined,
            environment: environment,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages([{ role: 'assistant', content: data.response }]);
        }
      } catch (error) {
        console.error('Failed to start conversation:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [customScenario, inputMode, customEnvironment, elevenLabsConversation, createSession, router, buildFirstMessage]);

  const startCustomScenario = useCallback(() => {
    if (!customScenario.trim()) return;
    
    const customScenarioObj: Scenario = {
      id: 'custom',
      name: 'Custom Scenario',
      description: customScenario,
      vocabulary: [],
      defaultEnvironment: customEnvironment,
    };
    
    setShowCustomDialog(false);
    startConversation(customScenarioObj);
  }, [customScenario, customEnvironment, startConversation]);

  // Send text message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selectedScenario || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          messages: [...messages, { role: 'user', content: userMessage }],
          customDescription: selectedScenario.id === 'custom' ? selectedScenario.description : undefined,
          environment: selectedEnvironment,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedScenario, isLoading, messages, selectedEnvironment]);

  // End conversation
  const endConversation = useCallback(async () => {
    if (!selectedScenario || messages.length < 2) return;

    // Stop ElevenLabs if active
    if (inputMode === 'elevenlabs' && elevenLabsConversation.status === 'connected') {
      await elevenLabsConversation.endSession();
    }

    // Stop ambiance
    if (ambianceAudioRef.current) {
      ambianceAudioRef.current.pause();
    }

    // Cleanup: Delete the dynamically created agent
    if (currentAgentId) {
      fetch('/api/voice/agent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: currentAgentId }),
      }).catch(console.error);
      setCurrentAgentId(null);
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          scenarioName: selectedScenario.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data);
        setView('feedback');
        clearSavedConversation();

        // Update session with feedback and mark as completed
        if (sessionId) {
          await fetch(`/api/conversation/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages,
              feedback: data,
              overallScore: data.overallScore,
              fluencyScore: data.fluencyScore,
              grammarScore: data.grammarScore,
              vocabularyScore: data.vocabularyScore,
              xpEarned: data.xpEarned,
              completed: true,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to get feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedScenario, messages, inputMode, elevenLabsConversation, clearSavedConversation, sessionId, currentAgentId]);

  const changeScenario = useCallback(async () => {
    // Stop ElevenLabs if active
    if (inputMode === 'elevenlabs' && elevenLabsConversation.status === 'connected') {
      await elevenLabsConversation.endSession();
    }
    // Stop ambiance
    if (ambianceAudioRef.current) {
      ambianceAudioRef.current.pause();
    }
    // Cleanup agent
    if (currentAgentId) {
      fetch('/api/voice/agent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: currentAgentId }),
      }).catch(console.error);
      setCurrentAgentId(null);
    }
    setView('select');
    setSelectedScenario(null);
    setMessages([]);
    setFeedback(null);
    setSessionId(null);
    clearSavedConversation();
    // Clear session from URL
    router.push('/conversation', { scroll: false });
  }, [inputMode, elevenLabsConversation, clearSavedConversation, router, currentAgentId]);

  // Copy session link to clipboard
  const copySessionLink = useCallback(() => {
    if (sessionId) {
      const link = `${window.location.origin}/conversation?session=${sessionId}`;
      navigator.clipboard.writeText(link);
    }
  }, [sessionId]);

  // ===== Render: Loading Session =====

  if (isLoadingSession) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Loading Conversation...</h2>
          <p className="text-muted-foreground">
            Restoring your previous session
          </p>
        </div>
      </div>
    );
  }

  // ===== Render: Continue Dialog =====

  if (showContinueDialog && savedConversation) {
    const timeAgo = Math.round((Date.now() - savedConversation.timestamp) / 60000);
    const timeText = timeAgo < 60 
      ? `${timeAgo} minute${timeAgo !== 1 ? 's' : ''} ago`
      : `${Math.round(timeAgo / 60)} hour${Math.round(timeAgo / 60) !== 1 ? 's' : ''} ago`;

    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <span className="flex justify-center mb-4"><LuMessageCircle className="w-12 h-12 text-primary" /></span>
          <h2 className="text-2xl font-bold mb-2">Continue Conversation?</h2>
          <p className="text-muted-foreground mb-6">
            You have an unfinished conversation from {timeText}.
          </p>
          
          <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
            <div className="text-sm font-medium mb-1">{savedConversation.scenario.name}</div>
            <div className="text-xs text-muted-foreground mb-2">
              {savedConversation.messages.length} messages
            </div>
            <div className="text-sm text-muted-foreground italic line-clamp-2">
              &quot;{savedConversation.messages[savedConversation.messages.length - 1]?.content}&quot;
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={continueConversation}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Continue Conversation
            </button>
            <button
              onClick={startNewConversation}
              className="w-full py-3 rounded-xl border border-border hover:bg-accent font-medium"
            >
              Start New Conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Render: Scenario Selection =====

  if (view === 'select') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Real Conversations</h1>
        <p className="text-muted-foreground mb-8">
          Practice speaking in realistic scenarios with AI-powered voice conversations!
        </p>

        {/* Input Mode Toggle */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl bg-card border border-border">
          <span className="text-sm font-medium">Conversation Mode:</span>
          <button
            onClick={() => setInputMode('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              inputMode === 'text'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <LuKeyboard className="w-4 h-4" /> Text
          </button>
          <button
            onClick={() => setInputMode('elevenlabs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              inputMode === 'elevenlabs'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <LuMic className="w-4 h-4" /> Voice (ElevenLabs)
          </button>
          {inputMode === 'elevenlabs' && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Real-time AI voice conversation
            </span>
          )}
        </div>

        {/* Voice Selection (only for ElevenLabs mode) */}
        {inputMode === 'elevenlabs' && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            <span className="text-sm font-medium mb-3 block">AI Voice:</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedVoice === voice.id
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                  }`}
                  title={voice.description}
                >
                  <div className="text-sm font-medium">{voice.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{voice.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Environment Selector */}
        <div className="mb-6 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Background Ambiance:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ambianceVolume}
                onChange={(e) => setAmbianceVolume(parseFloat(e.target.value))}
                className="w-20 h-2 rounded-lg appearance-none bg-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                onClick={() => setSelectedEnvironment(env.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedEnvironment === env.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                }`}
                title={env.description}
              >
                <span className="flex justify-center mb-1">{env.icon}</span>
                <span className="text-xs">{env.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Scenario Button */}
        <button
          onClick={() => setShowCustomDialog(true)}
          className="w-full p-6 mb-6 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all text-center"
        >
          <span className="flex justify-center mb-2"><LuSparkles className="w-7 h-7 text-primary" /></span>
          <h3 className="font-semibold text-lg text-primary mb-1">
            Create Custom Scenario
          </h3>
          <p className="text-sm text-muted-foreground">
            Describe any situation and environment you want to practice
          </p>
        </button>

        {/* Custom Scenario Dialog */}
        {showCustomDialog && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Your Scenario</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Describe the situation:</label>
                <textarea
                  value={customScenario}
                  onChange={(e) => setCustomScenario(e.target.value)}
                  placeholder="Example: I'm at a bakery in Munich trying to order breakfast pastries and ask about gluten-free options..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Choose the environment:</label>
                <div className="grid grid-cols-4 gap-2">
                  {ENVIRONMENTS.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => setCustomEnvironment(env.id)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        customEnvironment === env.id
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                      }`}
                      title={env.description}
                    >
                      <span className="flex justify-center">{env.icon}</span>
                      <span className="text-[10px]">{env.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startCustomScenario}
                  disabled={!customScenario.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  Start Conversation
                </button>
                <button
                  onClick={() => setShowCustomDialog(false)}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">Or choose a scenario:</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scenario) => {
            const defaultEnv = ENVIRONMENTS.find(e => e.id === scenario.defaultEnvironment);
            return (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedEnvironment(scenario.defaultEnvironment || 'none');
                  startConversation(scenario);
                }}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {scenario.name}
                  </h3>
                  {defaultEnv && (
                    <span className="text-lg" title={`Environment: ${defaultEnv.name}`}>
                      {defaultEnv.icon}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {scenario.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {scenario.vocabulary.slice(0, 4).map((word) => (
                    <span
                      key={word}
                      className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground"
                    >
                      {word}
                    </span>
                  ))}
                  {scenario.vocabulary.length > 4 && (
                    <span className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                      +{scenario.vocabulary.length - 4} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== Render: Feedback View =====

  if (view === 'feedback' && feedback) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <span className="flex justify-center mb-4"><FaTheaterMasks className="w-14 h-14 text-primary" /></span>
          <h1 className="text-2xl font-bold mb-2">Conversation Complete!</h1>
          <p className="text-muted-foreground">{feedback.encouragement}</p>
          
          {/* Session ID with copy link */}
          {sessionId && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                Session: {sessionId.slice(0, 8)}...
              </span>
              <button
                onClick={copySessionLink}
                className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                title="Copy shareable link"
              >
                <LuClipboard className="w-3 h-3" /> Copy Link
              </button>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <ScoreCard label="Overall" score={feedback.overallScore} />
          <ScoreCard label="Fluency" score={feedback.fluencyScore} />
          <ScoreCard label="Grammar" score={feedback.grammarScore} />
          <ScoreCard label="Vocabulary" score={feedback.vocabularyScore} />
        </div>

        {/* XP Earned */}
        <div className="text-center mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-2xl font-bold text-primary">+{feedback.xpEarned} XP</span>
        </div>

        {/* Strengths */}
        {feedback.strengths.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TbMuscle className="w-5 h-5 text-green-500" /> Strengths
            </h3>
            <ul className="space-y-2">
              {feedback.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-green-500">
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.improvements.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <LuTarget className="w-5 h-5 text-orange-500" /> Areas to Improve
            </h3>
            <ul className="space-y-2">
              {feedback.improvements.map((area, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-orange-500">
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Corrections */}
        {feedback.corrections.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <LuPencil className="w-5 h-5 text-blue-500" /> Corrections
            </h3>
            <div className="space-y-3">
              {feedback.corrections.map((correction, i) => (
                <div key={i} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex gap-4 mb-2">
                    <span className="text-red-500 line-through">{correction.original}</span>
                    <span className="text-green-500">→ {correction.corrected}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{correction.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => {
              setView('select');
              setFeedback(null);
              setMessages([]);
            }}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Try Another Scenario
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

  // ===== Render: Chat View =====

  const currentEnv = ENVIRONMENTS.find(e => e.id === selectedEnvironment);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 h-[calc(100dvh-8rem)] flex flex-col">
      {/* Hidden audio element for ambiance */}
      <audio ref={ambianceAudioRef} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">{selectedScenario?.name}</h1>
            {currentEnv && currentEnv.id !== 'none' && (
              <span className="text-lg" title={`Environment: ${currentEnv.name}`}>
                {currentEnv.icon}
              </span>
            )}
            {sessionId && (
              <button
                onClick={copySessionLink}
                className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors font-mono flex items-center gap-1"
                title="Copy session link"
              >
                {sessionId.slice(0, 8)}... <LuClipboard className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{selectedScenario?.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Environment picker */}
          <button
            onClick={() => setShowEnvironmentPicker(!showEnvironmentPicker)}
            className="p-2 rounded-lg bg-muted text-sm"
            title="Change environment"
          >
            <LuVolume2 className="w-4 h-4" />
          </button>
          {/* Mode indicator */}
          <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
            inputMode === 'elevenlabs' 
              ? 'bg-green-500/20 text-green-600' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {inputMode === 'elevenlabs' ? <><LuMic className="w-3 h-3" /> Voice</> : <><LuKeyboard className="w-3 h-3" /> Text</>}
          </span>
          <button
            onClick={changeScenario}
            className="px-3 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80"
          >
            Change
          </button>
          <button
            onClick={endConversation}
            disabled={messages.length < 2 || isLoading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            End & Get Feedback
          </button>
        </div>
      </div>

      {/* Environment picker dropdown */}
      {showEnvironmentPicker && (
        <div className="mb-4 p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Background Ambiance</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ambianceVolume}
              onChange={(e) => setAmbianceVolume(parseFloat(e.target.value))}
              className="w-24 h-2 rounded-lg appearance-none bg-muted"
            />
          </div>
          <div className="grid grid-cols-6 gap-1">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                onClick={() => {
                  setSelectedEnvironment(env.id);
                  setShowEnvironmentPicker(false);
                }}
                className={`p-2 rounded-lg text-center transition-all ${
                  selectedEnvironment === env.id
                    ? 'bg-primary/20 border border-primary'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
                title={env.description}
              >
                <span className="flex justify-center">{env.icon}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vocabulary hint */}
      {selectedScenario && selectedScenario.vocabulary.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Helpful words:</span>
          {selectedScenario.vocabulary.map((word) => (
            <span key={word} className="px-2 py-0.5 rounded bg-muted text-xs">
              {word}
            </span>
          ))}
        </div>
      )}

      {/* ElevenLabs Status */}
      {inputMode === 'elevenlabs' && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                elevenLabsConversation.status === 'connected' 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-muted-foreground'
              }`} />
              <span className="text-sm font-medium flex items-center gap-1">
                {elevenLabsConversation.status === 'connected' 
                  ? (elevenLabsConversation.isSpeaking ? <><LuVolume2 className="w-4 h-4" /> AI Speaking...</> : <><IoEarOutline className="w-4 h-4" /> Listening...</>) 
                  : 'Connecting...'}
              </span>
            </div>
            {elevenLabsConversation.status !== 'connected' && (
              <button
                onClick={() => startConversation(selectedScenario!)}
                className="px-3 py-1 rounded-lg bg-green-500 text-white text-sm"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted p-4 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {inputMode !== 'elevenlabs' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your response in German..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}

      {/* ElevenLabs voice input indicator */}
      {inputMode === 'elevenlabs' && elevenLabsConversation.status === 'connected' && (
        <div className="p-4 rounded-xl bg-card border border-border text-center">
          <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
            elevenLabsConversation.isSpeaking 
              ? 'bg-blue-500/20 animate-pulse' 
              : 'bg-green-500/20'
          }`}>
            {elevenLabsConversation.isSpeaking 
              ? <LuVolume2 className="w-8 h-8 text-blue-500" /> 
              : <LuMic className="w-8 h-8 text-green-500" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {elevenLabsConversation.isSpeaking 
              ? 'AI is speaking... Listen and wait for your turn'
              : 'Your turn! Speak in German...'}
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-blue-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border text-center">
      <div className={`text-2xl font-bold ${getColor(score)}`}>{score}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Loading...</h2>
          <p className="text-muted-foreground">
            Preparing your conversation experience
          </p>
        </div>
      </div>
    }>
      <ConversationContent />
    </Suspense>
  );
}
