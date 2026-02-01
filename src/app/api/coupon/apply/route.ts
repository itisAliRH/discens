import { createClient } from '@supabase/supabase-js';
import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextRequest, NextResponse } from 'next/server';

// Lazy-init admin client to avoid build-time env var access
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * POST /api/coupon/apply
 * Validate and apply a coupon code
 * 
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createUntypedServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const couponCode = code.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdmin();

    console.log(`[API] Applying coupon code "${couponCode}" for user:`, user.id);

    // 1. Validate coupon code exists and is active
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupon_codes')
      .select('*')
      .eq('code', couponCode)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        { error: 'Invalid or inactive coupon code' },
        { status: 400 }
      );
    }

    // 2. Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json(
        { error: 'Coupon code is not yet valid' },
        { status: 400 }
      );
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json(
        { error: 'Coupon code has expired' },
        { status: 400 }
      );
    }

    // 3. Check usage limits
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        { error: 'Coupon code has reached maximum usage limit' },
        { status: 400 }
      );
    }

    // 4. Check if user has already used this coupon
    const { data: existingUsage } = await supabaseAdmin
      .from('user_coupon_usage')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_code', couponCode)
      .maybeSingle();

    if (existingUsage) {
      return NextResponse.json(
        { error: 'You have already used this coupon code' },
        { status: 400 }
      );
    }

    // 5. Calculate expiration date based on discount type
    let expiresAt: Date | null = null;
    if (coupon.discount_type === 'free_trial') {
      // Add months to current date
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + coupon.discount_value);
    }

    // 6. Cancel any existing active or trial subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .in('status', ['active', 'trial']);

    // 7. Create new subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        tier: coupon.tier,
        status: 'trial',
        billing_cycle: 'monthly',
        price_paid: 0,
        coupon_code: couponCode,
        started_at: new Date().toISOString(),
        expires_at: expiresAt?.toISOString() || null,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('[API] Error creating subscription:', subscriptionError);
      return NextResponse.json(
        { error: `Failed to create subscription: ${subscriptionError.message}` },
        { status: 500 }
      );
    }

    // 8. Track coupon usage
    const { error: usageError } = await supabaseAdmin
      .from('user_coupon_usage')
      .insert({
        user_id: user.id,
        coupon_code: couponCode,
        subscription_id: subscription.id,
      });

    if (usageError) {
      console.error('[API] Error tracking coupon usage:', usageError);
      // Don't fail the request if usage tracking fails
    }

    // 9. Update coupon usage count
    await supabaseAdmin
      .from('coupon_codes')
      .update({ 
        used_count: coupon.used_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coupon.id);

    console.log(`[API] Coupon code "${couponCode}" applied successfully for user:`, user.id);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        expires_at: subscription.expires_at,
      },
      message: `Successfully upgraded to ${coupon.tier === 'super_plus' ? 'Super Plus' : 'Plus'} for ${coupon.discount_value} month${coupon.discount_value > 1 ? 's' : ''} free!`,
    });

  } catch (error) {
    console.error('[API] Coupon apply error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

