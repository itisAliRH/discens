import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { generateMaterials } from '@/lib/ai/memory';
import type { MaterialCategory, CEFRLevel } from '@/types/database';

interface GenerateWordsRequest {
  description: string;
  targetLanguage: 'en' | 'de';
  nativeLanguage: 'en' | 'de';
  selectedCategories?: MaterialCategory[];
}

/**
 * Clean word field by removing article prefixes (der/die/das)
 * Ensures word field contains only the word itself
 */
function cleanWordField(word: string, article: string | null): string {
  if (!word) return word;
  
  // Remove leading/trailing whitespace
  let cleaned = word.trim();
  
  // If article is provided, remove it from the word if present
  if (article) {
    const articleLower = article.toLowerCase().trim();
    // Remove article prefix (with space after)
    cleaned = cleaned.replace(new RegExp(`^${articleLower}\\s+`, 'i'), '');
    // Also handle cases where article might be at the start without proper spacing
    if (cleaned.toLowerCase().startsWith(articleLower)) {
      cleaned = cleaned.substring(articleLower.length).trim();
    }
  }
  
  // Also check for common German articles if target language is German
  const germanArticles = ['der', 'die', 'das'];
  for (const art of germanArticles) {
    if (cleaned.toLowerCase().startsWith(art + ' ')) {
      cleaned = cleaned.substring(art.length + 1).trim();
    }
  }
  
  return cleaned.trim();
}

/**
 * POST /api/onboarding/generate-words
 * Generate 20 words based on user's level description
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateWordsRequest = await request.json();
    const { description, targetLanguage, nativeLanguage, selectedCategories = ['daily_life'] } = body;

    if (!description || description.trim().length < 10) {
      return NextResponse.json({ error: 'Description is required and must be at least 10 characters' }, { status: 400 });
    }

    // Assess level from description
    const { assessLevelFromDescription } = await import('@/lib/ai/memory');
    const levelAssessment = await assessLevelFromDescription(description, targetLanguage);
    
    const estimatedLevel = (levelAssessment.estimatedLevel || 'A1') as CEFRLevel;
    const categories = selectedCategories.length > 0 
      ? selectedCategories 
      : (levelAssessment.suggestedCategories || ['daily_life']) as MaterialCategory[];

    // Generate 20 words based on description
    const generateResult = await generateMaterials({
      targetLanguage,
      nativeLanguage,
      categories: categories.slice(0, 5), // Max 5 categories
      cefrLevel: estimatedLevel,
      count: 20, // Generate 20 words
      memorySummary: description, // Use description as context
      customPrompt: `Based on this description of the user's language level: "${description}". Generate practical vocabulary words that match their current abilities and will help them progress. Focus on words they would need for daily conversations and the situations they described.`,
    });

    if (!generateResult.success || !generateResult.materials) {
      return NextResponse.json(
        { error: generateResult.error || 'Failed to generate words' },
        { status: 500 }
      );
    }

    // Extract only words (not phrases or grammar)
    const words = generateResult.materials.words || [];

    return NextResponse.json({
      success: true,
      words: words.map(word => {
        // Clean word field to ensure article is not included
        const cleanedWord = cleanWordField(word.word, word.article || null);
        
        // Ensure categories is an array and limit to 5
        const wordCategories = Array.isArray(word.categories) 
          ? word.categories.slice(0, 5)
          : ['daily_life'];
        
        return {
          word: cleanedWord,
          article: word.article || null,
          meaning: word.meaning,
          pronunciation: word.pronunciation || null,
          examples: word.examples || [],
          synonyms: word.synonyms || [],
          partOfSpeech: word.partOfSpeech,
          pluralForm: word.pluralForm || null,
          categories: wordCategories,
          difficultyLevel: word.difficultyLevel,
          cefrLevel: word.cefrLevel,
        };
      }),
      estimatedLevel,
      suggestedCategories: categories,
    });
  } catch (error) {
    console.error('Generate words error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
