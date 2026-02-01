/**
 * Subscription Management Utilities
 * Functions to fetch and check user subscription status
 */

import type { SubscriptionTier } from '@/types/pricing';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  billing_cycle: 'monthly' | 'yearly' | null;
  price_paid: number;
  coupon_code: string | null;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the active subscription for a user
 */
export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscription | null> {
  let data: UserSubscription | null = null;
  
  try {
    const response = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      console.error('Error fetching subscription:', response.error?.message || response.error);
      return null;
    }
    
    data = response.data as UserSubscription | null;
  } catch (err) {
    console.error('Exception while fetching subscription:', err instanceof Error ? err.message : err);
    return null;
  }

  // Check if subscription has expired
  if (data && data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      // Mark as expired
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', data.id);
      
      return null;
    }
  }

  return data;
}

/**
 * Get the current subscription tier for a user (defaults to 'free' if no active subscription)
 */
export async function getUserTier(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionTier> {
  const subscription = await getUserSubscription(supabase, userId);
  return subscription?.tier || 'free';
}

/**
 * Check if user has access to a specific tier or higher
 */
export async function hasTierAccess(
  supabase: SupabaseClient,
  userId: string,
  requiredTier: SubscriptionTier
): Promise<boolean> {
  const tier = await getUserTier(supabase, userId);
  
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    plus: 1,
    super_plus: 2,
  };

  return tierHierarchy[tier] >= tierHierarchy[requiredTier];
}

/**
 * Get subscription limits based on tier
 */
export function getSubscriptionLimits(tier: SubscriptionTier): {
  materials: number;
  conversations: number;
  reviewCards: number;
} {
  switch (tier) {
    case 'super_plus':
      return {
        materials: Infinity,
        conversations: Infinity,
        reviewCards: Infinity,
      };
    case 'plus':
      return {
        materials: 50,
        conversations: 20,
        reviewCards: 100,
      };
    case 'free':
    default:
      return {
        materials: 10,
        conversations: 3,
        reviewCards: 20,
      };
  }
}

/**
 * Check if a subscription is active (not expired or cancelled)
 */
export function isSubscriptionActive(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active' && subscription.status !== 'trial') return false;
  
  if (subscription.expires_at) {
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    return expiresAt > now;
  }
  
  return true;
}
