import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { updateMemorySummary } from '@/lib/ai/memory';
import type { MaterialType, MaterialCategory, CEFRLevel } from '@/types/database';

/**
 * GET /api/memory/materials
 * Get user's materials with optional filtering
 */
export async function GET(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    const { searchParams } = new URL(request.url);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory
    const { data: memory } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Build query with filters
    let query = supabase
      .from('materials')
      .select('*')
      .eq('memory_id', memory.id);

    // Apply filters
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const mastery = searchParams.get('mastery');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (category && category !== 'all') {
      query = query.contains('categories', [category]);
    }

    if (mastery) {
      const masteryLevel = parseInt(mastery);
      if (!isNaN(masteryLevel)) {
        query = query.eq('mastery_level', masteryLevel);
      }
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit));
    } else {
      query = query.limit(50);
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit || '50') - 1));
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Materials fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
    }

    // If search is provided, filter in memory (for content search)
    let filteredMaterials = materials || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMaterials = filteredMaterials.filter((m: { content: Record<string, unknown> }) => {
        const content = m.content;
        return (
          (content.word && String(content.word).toLowerCase().includes(searchLower)) ||
          (content.phrase && String(content.phrase).toLowerCase().includes(searchLower)) ||
          (content.rule && String(content.rule).toLowerCase().includes(searchLower)) ||
          (content.meaning && String(content.meaning).toLowerCase().includes(searchLower))
        );
      });
    }

    return NextResponse.json({
      materials: filteredMaterials,
      total: filteredMaterials.length,
    });
  } catch (error) {
    console.error('Materials fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/memory/materials
 * Add a new material
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory
    const { data: memory } = await supabase
      .from('memories')
      .select('id, total_materials')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      type,
      content,
      categories = ['daily_life'],
      difficulty_level = 1,
      cefr_level = 'A1',
      notes,
    } = body as {
      type: MaterialType;
      content: Record<string, unknown>;
      categories?: MaterialCategory[];
      difficulty_level?: number;
      cefr_level?: CEFRLevel;
      notes?: string;
    };

    // Validate required fields
    if (!type || !content) {
      return NextResponse.json({ error: 'Type and content are required' }, { status: 400 });
    }

    // Check for duplicates (for words)
    if (type === 'word' && content.word) {
      const wordText = String(content.word).toLowerCase().trim();
      
      // Get existing words and check for duplicates
      const { data: existingMaterials } = await supabase
        .from('materials')
        .select('content')
        .eq('memory_id', memory.id)
        .eq('type', 'word')
        .limit(1000); // Check up to 1000 existing words
      
      const hasDuplicate = existingMaterials?.some((m: { content: { word?: string } }) => {
        const existingWord = m.content?.word;
        return existingWord && existingWord.toLowerCase().trim() === wordText;
      });
      
      if (hasDuplicate) {
        return NextResponse.json(
          { error: 'This word already exists in your memory' },
          { status: 409 }
        );
      }
    }

    // Insert material
    const { data: material, error } = await supabase
      .from('materials')
      .insert({
        memory_id: memory.id,
        type,
        content,
        categories,
        difficulty_level,
        mastery_level: 0,
        cefr_level,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Material insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update memory stats
    await supabase
      .from('memories')
      .update({ total_materials: memory.total_materials + 1 })
      .eq('id', memory.id);

    // Create review card for the material
    await supabase
      .from('review_cards')
      .insert({
        material_id: material.id,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 'New',
        due: new Date().toISOString(),
      });

    // Update memory summary asynchronously (non-blocking)
    // Note: Summary updates are also handled by the memory page after material operations
    // This is a backup to ensure summary stays updated
    (async () => {
      try {
        const { data: memoryData } = await supabase
          .from('memories')
          .select('summary, goals, total_materials, mastered_materials')
          .eq('id', memory.id)
          .single();
        
        if (memoryData) {
          const result = await updateMemorySummary({
            currentSummary: memoryData.summary || '',
            newMaterials: [{ type: material.type, content: material.content, masteryLevel: 0 }],
            recentMistakes: [],
            goals: memoryData.goals || [],
            totalMaterials: memoryData.total_materials || 0,
            masteredMaterials: memoryData.mastered_materials || 0,
          });
          
          if (result.success) {
            await supabase
              .from('memories')
              .update({
                summary: result.summary,
                summary_updated_at: new Date().toISOString(),
              })
              .eq('id', memory.id);
          }
        }
      } catch (err) {
        console.error('Failed to update memory summary:', err);
      }
    })();

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error('Material creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
