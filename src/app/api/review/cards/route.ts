import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/review/cards
 * Fetch cards that are due for review
 */
export async function GET() {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's memory
    const { data: memory } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found. Complete onboarding first.' }, { status: 404 });
    }

    // Get materials with their review cards that are due
    const now = new Date().toISOString();
    const { data: cards, error } = await supabase
      .from('review_cards')
      .select(`
        id,
        material_id,
        stability,
        difficulty,
        elapsed_days,
        scheduled_days,
        reps,
        lapses,
        state,
        due,
        last_review,
        materials (
          id,
          type,
          content,
          categories,
          difficulty_level,
          mastery_level,
          cefr_level
        )
      `)
      .lte('due', now)
      .order('due', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Cards fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    // Filter to only include cards from user's materials
    const userMaterialIds = new Set(
      (await supabase
        .from('materials')
        .select('id')
        .eq('memory_id', memory.id))
        .data?.map((m: { id: string }) => m.id) || []
    );

    const dueCards = cards?.filter((card: { material_id: string }) => 
      userMaterialIds.has(card.material_id)
    ) || [];

    return NextResponse.json({
      cards: dueCards,
      totalDue: dueCards.length,
    });
  } catch (error) {
    console.error('Review cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
