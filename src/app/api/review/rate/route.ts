import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { Rating, type Grade } from 'ts-fsrs';
import {
  dbCardToFsrsCard,
  fsrsCardToDbUpdate,
  rateCard,
  calculateMasteryLevel,
} from '@/lib/fsrs/review';
import type { ReviewCard } from '@/types/database';

/**
 * POST /api/review/rate
 * Rate a review card and update the schedule
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { cardId, rating } = body as {
      cardId: string;
      rating: 'again' | 'hard' | 'good' | 'easy';
    };

    if (!cardId || !rating) {
      return NextResponse.json(
        { error: 'cardId and rating are required' },
        { status: 400 }
      );
    }

    // Convert rating string to FSRS Grade
    const ratingMap: Record<string, Grade> = {
      again: Rating.Again,
      hard: Rating.Hard,
      good: Rating.Good,
      easy: Rating.Easy,
    };
    const fsrsRating = ratingMap[rating];

    // Fetch the card
    const { data: dbCard, error: cardError } = await supabase
      .from('review_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !dbCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Convert to FSRS card and rate
    const fsrsCard = dbCardToFsrsCard(dbCard as ReviewCard);
    const { card: newCard, log } = rateCard(fsrsCard, fsrsRating);

    // Convert back to DB format
    const dbUpdate = fsrsCardToDbUpdate(newCard);

    // Update the review card
    const { error: updateError } = await supabase
      .from('review_cards')
      .update(dbUpdate)
      .eq('id', cardId);

    if (updateError) {
      console.error('Card update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update card' },
        { status: 500 }
      );
    }

    // Update material mastery level
    const newMasteryLevel = calculateMasteryLevel(newCard);
    await supabase
      .from('materials')
      .update({ mastery_level: newMasteryLevel })
      .eq('id', dbCard.material_id);

    // Award XP based on rating
    const xpMap: Record<string, number> = {
      again: 1,
      hard: 3,
      good: 5,
      easy: 7,
    };
    const xpEarned = xpMap[rating];

    await supabase
      .from('profiles')
      .update({
        total_xp: supabase.rpc('increment_xp', { amount: xpEarned }),
      })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      nextDue: newCard.due.toISOString(),
      masteryLevel: newMasteryLevel,
      xpEarned,
      log: {
        rating: log.rating,
        elapsed_days: log.elapsed_days,
        scheduled_days: log.scheduled_days,
      },
    });
  } catch (error) {
    console.error('Review rate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
