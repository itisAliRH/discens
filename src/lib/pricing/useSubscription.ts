'use client';

import { useState, useEffect } from 'react';
import { useUntypedSupabase } from '@/lib/supabase/client-untyped';
import { getUserSubscription, getUserTier, getSubscriptionLimits, isSubscriptionActive, type UserSubscription } from './subscription';
import type { SubscriptionTier } from '@/types/pricing';

export interface SubscriptionState {
  subscription: UserSubscription | null;
  tier: SubscriptionTier;
  limits: {
    materials: number;
    conversations: number;
    reviewCards: number;
  };
  isLoading: boolean;
  error: string | null;
  isActive: boolean;
}

/**
 * Hook to get current user subscription status and limits
 */
export function useSubscription() {
  const supabase = useUntypedSupabase();
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    tier: 'free',
    limits: getSubscriptionLimits('free'),
    isLoading: true,
    error: null,
    isActive: false,
  });

  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setState({
            subscription: null,
            tier: 'free',
            limits: getSubscriptionLimits('free'),
            isLoading: false,
            error: null,
            isActive: false,
          });
          return;
        }

        const subscription = await getUserSubscription(supabase, user.id);
        const tier = await getUserTier(supabase, user.id);
        const limits = getSubscriptionLimits(tier);
        const active = isSubscriptionActive(subscription);

        setState({
          subscription,
          tier,
          limits,
          isLoading: false,
          error: null,
          isActive: active,
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch subscription',
        }));
      }
    };

    fetchSubscription();

    // Refresh subscription every 5 minutes
    const interval = setInterval(fetchSubscription, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [supabase]);

  return state;
}

/**
 * Hook to check if user has access to a specific tier
 */
export function useHasTierAccess(requiredTier: SubscriptionTier) {
  const { tier, isLoading } = useSubscription();

  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    plus: 1,
    super_plus: 2,
  };

  return {
    hasAccess: !isLoading && tierHierarchy[tier] >= tierHierarchy[requiredTier],
    isLoading,
  };
}

/**
 * Hook to check if a feature is available based on usage limits
 */
export function useFeatureAccess() {
  const { limits, tier, isActive } = useSubscription();

  return {
    canUseMaterials: limits.materials === Infinity || isActive,
    canUseConversations: limits.conversations === Infinity || isActive,
    canUseReviewCards: limits.reviewCards === Infinity || isActive,
    limits,
    tier,
    isActive,
  };
}
