import {
  fsrs,
  createEmptyCard,
  generatorParameters,
  Rating,
  State,
  type Card,
  type RecordLog,
  type FSRSParameters,
  type Grade,
} from 'ts-fsrs';

/**
 * FSRS (Free Spaced Repetition Scheduler) Configuration
 * Optimized parameters for language learning
 */
const params: FSRSParameters = generatorParameters({
  request_retention: 0.9,      // Target 90% retention rate
  maximum_interval: 365,       // Maximum interval of 1 year
  enable_fuzz: true,           // Add randomness to prevent clustering
  enable_short_term: true,     // Enable short-term scheduling for new cards
});

/**
 * FSRS Scheduler Instance
 * Used for calculating review schedules
 */
export const scheduler = fsrs(params);

/**
 * Creates a new empty card for a material
 * @param now - Optional date for card creation (defaults to current time)
 */
export function createNewCard(now?: Date): Card {
  return createEmptyCard(now ?? new Date());
}

/**
 * Schedules a card review and returns all possible outcomes
 * @param card - The card to schedule
 * @param now - The current time
 * @returns RecordLog with outcomes for each rating
 */
export function scheduleCard(card: Card, now: Date = new Date()): RecordLog {
  return scheduler.repeat(card, now);
}

/**
 * Gets the next card state for a specific grade
 * @param card - The card to review
 * @param grade - The user's grade (Again, Hard, Good, Easy) - excludes Manual
 * @param now - The current time
 */
export function reviewCard(card: Card, grade: Grade, now: Date = new Date()) {
  return scheduler.next(card, now, grade);
}

/**
 * Converts a Rating to a Grade (excludes Manual)
 * Use this when you have a Rating and need to pass it to reviewCard
 */
export function ratingToGrade(rating: Rating): Grade | null {
  if (rating === Rating.Manual) {
    return null;
  }
  return rating as Grade;
}

/**
 * Converts a card state to a human-readable string
 */
export function getStateLabel(state: State): string {
  const labels: Record<State, string> = {
    [State.New]: 'New',
    [State.Learning]: 'Learning',
    [State.Review]: 'Review',
    [State.Relearning]: 'Relearning',
  };
  return labels[state];
}

/**
 * Gets the priority score for a card (lower = higher priority)
 * Based on how overdue the card is
 */
export function getCardPriority(card: Card, now: Date = new Date()): number {
  const dueTime = card.due.getTime();
  const currentTime = now.getTime();
  
  // Cards that are due or overdue get higher priority (lower score)
  if (dueTime <= currentTime) {
    return -(currentTime - dueTime); // Negative = overdue, more negative = more overdue
  }
  
  // Future cards get lower priority (positive score)
  return dueTime - currentTime;
}

// Re-export types and enums for convenience
export { Rating, State, type Card, type RecordLog, type Grade };
