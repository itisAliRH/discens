import { createClient } from '@supabase/supabase-js';
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
 * GET /api/coupon/validate?code=xxx
 * Validate a coupon code without applying it
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const couponCode = code.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdmin();

    // Get coupon details
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupon_codes')
      .select('*')
      .eq('code', couponCode)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or inactive coupon code',
      });
    }

    // Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon code is not yet valid',
      });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon code has expired',
      });
    }

    // Check usage limits
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon code has reached maximum usage limit',
      });
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        tier: coupon.tier,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
    });

  } catch (error) {
    console.error('[API] Coupon validate error:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
