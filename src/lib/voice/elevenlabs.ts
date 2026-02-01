'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

/**
 * Conversation Scenario Types
 */
export type ConversationScenario =
  | 'coworker'
  | 'landlord'
  | 'doctor'
  | 'hr'
  | 'shop_assistant'
  | 'restaurant'
  | 'bank'
  | 'custom';

/**
 * Scenario Configuration
 */
export interface ScenarioConfig {
  id: ConversationScenario;
  title: string;
  description: string;
  systemPrompt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Predefined Conversation Scenarios
 */
export const SCENARIOS: Record<ConversationScenario, ScenarioConfig> = {
  coworker: {
    id: 'coworker',
    title: 'Office Colleague',
    description: 'Practice workplace conversations with a friendly coworker',
    systemPrompt:
      'You are a friendly coworker having a casual conversation at the office. Be natural, ask about their day, discuss work topics, and help them practice professional language.',
    difficulty: 'intermediate',
  },
  landlord: {
    id: 'landlord',
    title: 'Landlord',
    description: 'Handle housing-related conversations',
    systemPrompt:
      'You are a landlord discussing apartment matters. Topics may include rent, repairs, lease terms, or building rules. Be professional but approachable.',
    difficulty: 'intermediate',
  },
  doctor: {
    id: 'doctor',
    title: 'Doctor Visit',
    description: 'Practice medical appointment conversations',
    systemPrompt:
      'You are a doctor conducting a routine appointment. Ask about symptoms, provide advice, and explain medical terms in simple language when needed.',
    difficulty: 'advanced',
  },
  hr: {
    id: 'hr',
    title: 'HR Interview',
    description: 'Practice job interview scenarios',
    systemPrompt:
      'You are an HR representative conducting a job interview. Ask about experience, skills, and career goals. Be professional and encouraging.',
    difficulty: 'advanced',
  },
  shop_assistant: {
    id: 'shop_assistant',
    title: 'Shop Assistant',
    description: 'Practice shopping and customer service interactions',
    systemPrompt:
      'You are a helpful shop assistant. Help the customer find products, explain features, discuss prices, and handle returns or exchanges.',
    difficulty: 'beginner',
  },
  restaurant: {
    id: 'restaurant',
    title: 'Restaurant Server',
    description: 'Practice ordering food and restaurant interactions',
    systemPrompt:
      'You are a friendly restaurant server. Take orders, explain menu items, make recommendations, and handle special requests.',
    difficulty: 'beginner',
  },
  bank: {
    id: 'bank',
    title: 'Bank Teller',
    description: 'Practice banking and financial conversations',
    systemPrompt:
      'You are a bank teller helping a customer. Assist with account inquiries, transactions, and explain banking services.',
    difficulty: 'intermediate',
  },
  custom: {
    id: 'custom',
    title: 'Custom Scenario',
    description: 'Create your own conversation scenario',
    systemPrompt: '',
    difficulty: 'intermediate',
  },
};

/**
 * Conversation Message Type
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Conversation State
 */
export interface ConversationState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  messages: ConversationMessage[];
  errors: string[];
}

/**
 * Hook for managing ElevenLabs conversations
 */
export function useLanguageConversation() {
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    messages: [],
    errors: [],
  });

  const conversation = useConversation({
    onConnect: () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    },
    onDisconnect: () => {
      setState((prev) => ({ ...prev, isConnected: false, isListening: false }));
    },
    onMessage: (message) => {
      if (message.message) {
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              role: message.source === 'user' ? 'user' : 'assistant',
              content: message.message,
              timestamp: new Date(),
            },
          ],
        }));
      }
    },
    onError: (error) => {
      const errorMessage = typeof error === 'string' 
        ? error 
        : (error as Error)?.message || 'Unknown error';
      setState((prev) => ({
        ...prev,
        errors: [...prev.errors, errorMessage],
      }));
    },
  });

  const startConversation = useCallback(
    async (scenario: ConversationScenario, userContext?: string) => {
      // Note: This hook is deprecated in favor of dynamic agent creation
      // See: src/app/[locale]/(main)/conversation/page.tsx for the new implementation
      console.warn('useLanguageConversation.startConversation is deprecated. Use dynamic agent creation instead.');
      
      const config = SCENARIOS[scenario];

      try {
        // This would need an agentId or signedUrl from dynamic creation
        // Left as placeholder for backwards compatibility
        setState((prev) => ({
          ...prev,
          errors: [...prev.errors, 'This method requires dynamic agent creation'],
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            error instanceof Error ? error.message : 'Failed to start conversation',
          ],
        }));
      }
    },
    [conversation]
  );

  const endConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, errors: [] }));
  }, []);

  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
  }, []);

  return {
    ...state,
    conversation,
    startConversation,
    endConversation,
    clearErrors,
    clearMessages,
  };
}
