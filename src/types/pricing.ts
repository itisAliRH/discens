/**
 * Pricing and Subscription Types
 * Types for managing subscription tiers, billing cycles, and pricing plans
 */

export type SubscriptionTier = 'free' | 'plus' | 'super_plus';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
  value?: string | number;
  tooltip?: string;
}

export interface PricingPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number; // Price per month when billed yearly
  features: PlanFeature[];
  highlighted?: boolean;
  popular?: boolean;
  cta: string;
}

export interface StudentDiscount {
  tier: SubscriptionTier;
  discountPercent: number;
  eligibleCycles: BillingCycle[];
  requiresEduEmail: boolean;
}

export interface SubscriptionDetails {
  tier: SubscriptionTier;
  cycle: BillingCycle;
  isStudent: boolean;
  price: number;
  startDate: string;
  nextBillingDate?: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
}

export interface CheckoutSelection {
  plan: PricingPlan;
  cycle: BillingCycle;
  isStudent: boolean;
  finalPrice: number;
}

// Feature comparison for all tiers
export interface FeatureComparison {
  category: string;
  features: {
    name: string;
    free: string | boolean;
    plus: string | boolean;
    superPlus: string | boolean;
    tooltip?: string;
  }[];
}
