'use client';

import { useEffect, useState } from 'react';

const FALLBACK_EXAMPLES = [
  'I want to learn how to order food at a restaurant in Spanish',
  'I want to learn business vocabulary for my upcoming presentation',
  'I want to learn medical terms for my doctor appointment',
  'I want to learn how to ask for directions while traveling',
  'I want to learn conversational phrases for making friends',
  'I want to learn tech terminology for my software development work',
  'I want to learn cooking vocabulary for following recipes',
  'I want to learn emergency phrases for staying safe abroad',
];

export function usePlaceholderExamples(): string[] {
  const [examples, setExamples] = useState<string[]>(FALLBACK_EXAMPLES);

  useEffect(() => {
    let cancelled = false;

    async function fetchExamples() {
      try {
        const response = await fetch('/api/learn/placeholder-examples');
        if (!response.ok) {
          console.warn('Failed to fetch placeholder examples');
          return;
        }

        const data = await response.json();
        if (!cancelled && data.examples && data.examples.length > 0) {
          setExamples(data.examples);
        }
      } catch (error) {
        console.error('Error fetching placeholder examples:', error);
        // Keep fallback examples on error
      }
    }

    fetchExamples();

    return () => {
      cancelled = true;
    };
  }, []);

  return examples;
}
