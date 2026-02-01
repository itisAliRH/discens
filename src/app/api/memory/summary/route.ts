import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { updateMemorySummary } from '@/lib/ai/memory';
import { NextResponse } from 'next/server';

/**
 * POST /api/memory/summary
 * Trigger AI-powered memory summary update
 */
export async function POST() {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory with current data
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select('id, summary, goals, total_materials, mastered_materials')
      .eq('user_id', user.id)
      .single();

    if (memoryError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Get recent materials (last 20)
    const { data: recentMaterials } = await supabase
      .from('materials')
      .select('type, content, mastery_level')
      .eq('memory_id', memory.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent mistakes
    const { data: recentMistakes } = await supabase
      .from('mistakes')
      .select('pattern, mistake_type, occurrences')
      .eq('user_id', user.id)
      .eq('resolved', false)
      .order('last_occurrence', { ascending: false })
      .limit(10);

    // Generate new summary using AI
    const result = await updateMemorySummary({
      currentSummary: memory.summary || '',
      newMaterials: (recentMaterials || []).map((m: { type: string; content: unknown; mastery_level: number }) => ({
        type: m.type,
        content: m.content,
        masteryLevel: m.mastery_level,
      })),
      recentMistakes: (recentMistakes || []).map((m: { pattern: string; mistake_type: string; occurrences: number }) => ({
        pattern: m.pattern,
        type: m.mistake_type,
        occurrences: m.occurrences,
      })),
      goals: memory.goals || [],
      totalMaterials: memory.total_materials || 0,
      masteredMaterials: memory.mastered_materials || 0,
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to generate summary' 
      }, { status: 500 });
    }

    // Update the memory with new summary
    const { error: updateError } = await supabase
      .from('memories')
      .update({
        summary: result.summary,
        summary_updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to save summary' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      suggestedGoals: result.suggestedGoals,
      strengthAreas: result.strengthAreas,
      weaknessAreas: result.weaknessAreas,
      recommendedLevel: result.recommendedLevel,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Summary update error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
