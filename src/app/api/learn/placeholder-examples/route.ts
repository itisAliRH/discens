import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// In-memory cache with 24h TTL (shared across all users)
const cache: {
  data: string[] | null;
  expiresAt: number;
} = {
  data: null,
  expiresAt: 0,
};

const examplesSchema = z.object({
  examples: z.array(z.string()).length(10),
});

async function generatePlaceholderExamples(): Promise<string[]> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: examplesSchema,
      prompt: `Generate 10 diverse, practical example prompts for a language learning app.
Each prompt should be 10-20 words and phrased as "I want to learn..." style.
Cover these topics: travel, work, medical, shopping, social, tech, hobbies, emergencies, cultural topics.
Make them realistic scenarios someone would actually want to learn for.`,
      temperature: 0.9,
    });

    return result.object.examples;
  } catch (error) {
    console.error('Failed to generate placeholder examples:', error);
    return [];
  }
}

export async function GET() {
  const now = Date.now();

  // Return cached data if still valid
  if (cache.data && now < cache.expiresAt) {
    return NextResponse.json(
      { examples: cache.data },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      }
    );
  }

  // Generate new examples
  const examples = await generatePlaceholderExamples();

  // Update cache if generation succeeded
  if (examples.length > 0) {
    cache.data = examples;
    cache.expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
  }

  return NextResponse.json(
    { examples },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}
