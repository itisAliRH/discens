import { fsrs, createEmptyCard, Rating, State, generatorParameters, type Card, type ReviewLog, type Grade } from 'ts-fsrs';
import type { ReviewCard, ReviewCardUpdate } from '@/types/database';

/**
 * FSRS (Free Spaced Repetition Scheduler) integration
 * 
 * Rating scale:
 * 1 = Again (complete failure, need to relearn)
 * 2 = Hard (correct but with difficulty)
 * 3 = Good (correct with some hesitation)
 * 4 = Easy (perfect recall)
 */

// Initialize FSRS with optimized parameters
const params = generatorParameters({
  request_retention: 0.9, // Target 90% retention rate
  maximum_interval: 365, // Max 1 year between reviews
  enable_fuzz: true, // Add randomness to prevent same-day reviews
  w: [
    0.4, // Initial stability for Again
    0.6, // Initial stability for Hard
    2.4, // Initial stability for Good
    5.8, // Initial stability for Easy
    4.93, // Difficulty factor
    0.94,
    0.86,
    0.01,
    1.49,
    0.14,
    0.94,
    2.18,
    0.05,
    0.34,
    1.26,
    0.29,
    2.61,
  ],
});

export const scheduler = fsrs(params);

/**
 * Convert database ReviewCard to ts-fsrs Card
 */
export function dbCardToFsrsCard(dbCard: ReviewCard): Card {
  const baseCard = createEmptyCard(new Date(dbCard.due));
  return {
    ...baseCard,
    due: new Date(dbCard.due),
    stability: dbCard.stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsed_days,
    scheduled_days: dbCard.scheduled_days,
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: stateFromString(dbCard.state),
    last_review: dbCard.last_review ? new Date(dbCard.last_review) : undefined,
  };
}

/**
 * Convert ts-fsrs Card back to database format
 */
export function fsrsCardToDbUpdate(card: Card): ReviewCardUpdate {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: stateToString(card.state),
    last_review: card.last_review?.toISOString() || null,
  };
}

/**
 * Convert State enum to database string
 */
function stateToString(state: State): 'New' | 'Learning' | 'Review' | 'Relearning' {
  switch (state) {
    case State.New: return 'New';
    case State.Learning: return 'Learning';
    case State.Review: return 'Review';
    case State.Relearning: return 'Relearning';
    default: return 'New';
  }
}

/**
 * Convert database string to State enum
 */
function stateFromString(state: string): State {
  switch (state) {
    case 'New': return State.New;
    case 'Learning': return State.Learning;
    case 'Review': return State.Review;
    case 'Relearning': return State.Relearning;
    default: return State.New;
  }
}

/**
 * Rate a card and get the updated schedule
 */
export function rateCard(
  card: Card,
  rating: Grade,
  now: Date = new Date()
): { card: Card; log: ReviewLog } {
  const result = scheduler.next(card, now, rating);
  return {
    card: result.card,
    log: result.log,
  };
}

/**
 * Create a new empty card for a material
 */
export function createNewCard(): Card {
  return createEmptyCard(new Date());
}

/**
 * Get cards that are due for review
 */
export function isDue(card: Card, now: Date = new Date()): boolean {
  return card.due <= now;
}

/**
 * Convert user's answer quality to FSRS Rating
 * 
 * @param isCorrect - Whether the answer was correct
 * @param responseTime - Time taken in milliseconds
 * @param wasHesitant - Did the user request hints or take multiple attempts
 */
export function calculateRating(
  isCorrect: boolean,
  responseTime: number,
  wasHesitant: boolean = false
): Grade {
  if (!isCorrect) {
    return Rating.Again; // Wrong answer
  }

  // Fast response (< 3 seconds) and no hesitation = Easy
  if (responseTime < 3000 && !wasHesitant) {
    return Rating.Easy;
  }

  // Moderate response (< 10 seconds) = Good
  if (responseTime < 10000 && !wasHesitant) {
    return Rating.Good;
  }

  // Slow response or hesitation = Hard
  return Rating.Hard;
}

/**
 * Get human-readable time until next review
 */
export function getTimeUntilReview(card: Card, now: Date = new Date()): string {
  const diff = card.due.getTime() - now.getTime();
  
  if (diff <= 0) return 'Now';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours} hr`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''}`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''}`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

/**
 * Get preview of next review intervals for each rating
 */
export function getIntervalPreview(
  card: Card,
  now: Date = new Date()
): Record<'again' | 'hard' | 'good' | 'easy', string> {
  const againResult = scheduler.next(card, now, Rating.Again);
  const hardResult = scheduler.next(card, now, Rating.Hard);
  const goodResult = scheduler.next(card, now, Rating.Good);
  const easyResult = scheduler.next(card, now, Rating.Easy);
  
  return {
    again: getTimeUntilReview(againResult.card, now),
    hard: getTimeUntilReview(hardResult.card, now),
    good: getTimeUntilReview(goodResult.card, now),
    easy: getTimeUntilReview(easyResult.card, now),
  };
}

/**
 * Calculate mastery level (0-5) based on FSRS card state
 */
export function calculateMasteryLevel(card: Card): 0 | 1 | 2 | 3 | 4 | 5 {
  if (card.state === State.New) return 0;
  
  // Based on stability and reps
  if (card.stability < 1) return 1;
  if (card.stability < 7) return 2;
  if (card.stability < 30) return 3;
  if (card.stability < 90) return 4;
  return 5;
}

/**
 * Sort cards by priority (due cards first, then by stability)
 */
export function sortCardsByPriority(cards: Array<{ card: Card; id: string }>): Array<{ card: Card; id: string }> {
  const now = new Date();
  
  return [...cards].sort((a, b) => {
    // Due cards first
    const aDue = a.card.due <= now;
    const bDue = b.card.due <= now;
    
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    
    // Then by due date
    if (aDue && bDue) {
      return a.card.due.getTime() - b.card.due.getTime();
    }
    
    // For non-due cards, lower stability first (needs more practice)
    return a.card.stability - b.card.stability;
  });
}
