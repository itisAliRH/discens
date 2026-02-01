/**
 * Pricing Plans Configuration
 * Centralized pricing data for all subscription tiers
 */

import type { PricingPlan, StudentDiscount, FeatureComparison } from '@/types/pricing';

export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    features: [
      { id: 'materials', name: '10 daily learning materials', included: true },
      { id: 'conversations', name: '3 AI conversations per day', included: true },
      { id: 'review', name: '20 review cards per day', included: true },
      { id: 'quiz-basic', name: 'Basic quiz types', included: true },
      { id: 'analytics-basic', name: 'Basic progress tracking', included: true },
      { id: 'voice', name: 'Voice practice', included: false },
      { id: 'advanced-analytics', name: 'Advanced analytics', included: false },
      { id: 'priority', name: 'Priority support', included: false },
    ],
    cta: 'Get Started',
  },
  {
    tier: 'plus',
    name: 'Plus',
    description: 'For serious language learners',
    monthlyPrice: 19.99,
    yearlyPrice: 191.90,
    yearlyMonthlyEquivalent: 15.99,
    features: [
      { id: 'materials', name: '50 daily learning materials', included: true },
      { id: 'conversations', name: '20 AI conversations per day', included: true },
      { id: 'review', name: '100 review cards per day', included: true },
      { id: 'quiz-all', name: 'All quiz types', included: true },
      { id: 'voice', name: 'Voice practice', included: true },
      { id: 'mistake-advanced', name: 'Advanced mistake analysis', included: true },
      { id: 'analytics-detailed', name: 'Detailed progress analytics', included: true },
      { id: 'ad-free', name: 'Ad-free experience', included: true },
      { id: 'priority', name: 'Priority support', included: false },
    ],
    popular: true,
    highlighted: true,
    cta: 'Start Plus',
  },
  {
    tier: 'super_plus',
    name: 'Super Plus',
    description: 'Ultimate learning experience',
    monthlyPrice: 59.99,
    yearlyPrice: 575.90,
    yearlyMonthlyEquivalent: 47.99,
    features: [
      { id: 'materials', name: 'Unlimited learning materials', included: true },
      { id: 'conversations', name: 'Unlimited AI conversations', included: true },
      { id: 'review', name: 'Unlimited review cards', included: true },
      { id: 'quiz-custom', name: 'All quiz types + Custom', included: true },
      { id: 'voice', name: 'Voice practice', included: true },
      { id: 'ai-coach', name: 'Advanced AI coach', included: true },
      { id: 'analytics-export', name: 'Analytics + Export', included: true },
      { id: 'priority', name: 'Priority support', included: true },
      { id: 'ad-free', name: 'Ad-free experience', included: true },
    ],
    cta: 'Go Super Plus',
  },
];

export const STUDENT_DISCOUNTS: StudentDiscount[] = [
  {
    tier: 'plus',
    discountPercent: 100, // Free
    eligibleCycles: ['yearly'],
    requiresEduEmail: true,
  },
  {
    tier: 'super_plus',
    discountPercent: 30,
    eligibleCycles: ['yearly'],
    requiresEduEmail: true,
  },
];

export const FEATURE_COMPARISON: FeatureComparison[] = [
  {
    category: 'Learning Content',
    features: [
      {
        name: 'Daily learning materials',
        free: '10',
        plus: '50',
        superPlus: 'Unlimited',
      },
      {
        name: 'AI conversations',
        free: '3/day',
        plus: '20/day',
        superPlus: 'Unlimited',
      },
      {
        name: 'Review cards',
        free: '20/day',
        plus: '100/day',
        superPlus: 'Unlimited',
      },
    ],
  },
  {
    category: 'Features',
    features: [
      {
        name: 'Quiz types',
        free: 'Basic',
        plus: 'All',
        superPlus: 'All + Custom',
      },
      {
        name: 'Voice practice',
        free: false,
        plus: true,
        superPlus: true,
      },
      {
        name: 'Mistake analysis',
        free: 'Basic',
        plus: 'Advanced',
        superPlus: 'Advanced + AI Coach',
      },
      {
        name: 'Progress analytics',
        free: 'Basic',
        plus: 'Detailed',
        superPlus: 'Detailed + Export',
      },
    ],
  },
  {
    category: 'Support & Experience',
    features: [
      {
        name: 'Priority support',
        free: false,
        plus: false,
        superPlus: true,
      },
      {
        name: 'Ad-free experience',
        free: false,
        plus: true,
        superPlus: true,
      },
    ],
  },
];

export function getPlanByTier(tier: string): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.tier === tier);
}

export function calculatePrice(
  plan: PricingPlan,
  cycle: 'monthly' | 'yearly',
  isStudent: boolean
): number {
  const basePrice = cycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  
  if (!isStudent || basePrice === 0) {
    return basePrice;
  }

  const discount = STUDENT_DISCOUNTS.find(
    (d) => d.tier === plan.tier && d.eligibleCycles.includes(cycle)
  );

  if (!discount) {
    return basePrice;
  }

  return basePrice * (1 - discount.discountPercent / 100);
}

export function getStudentDiscount(tier: string, cycle: 'monthly' | 'yearly'): StudentDiscount | undefined {
  return STUDENT_DISCOUNTS.find(
    (d) => d.tier === tier && d.eligibleCycles.includes(cycle)
  );
}
