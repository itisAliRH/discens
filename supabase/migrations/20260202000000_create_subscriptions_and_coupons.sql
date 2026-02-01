-- ============================================
-- SUBSCRIPTIONS AND COUPON CODES
-- ============================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier TEXT NOT NULL CHECK (tier IN ('free', 'plus', 'super_plus')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  
  -- Billing
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  price_paid DECIMAL(10, 2) DEFAULT 0,
  
  -- Coupon code used (if any)
  coupon_code TEXT,
  
  -- Trial and expiration
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Partial unique index: one active or trial subscription per user
CREATE UNIQUE INDEX idx_subscriptions_user_active_unique 
  ON subscriptions(user_id) 
  WHERE status IN ('active', 'trial');

-- Coupon codes table
CREATE TABLE IF NOT EXISTS coupon_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  
  -- Coupon details
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('plus', 'super_plus')),
  discount_type TEXT DEFAULT 'free_trial' CHECK (discount_type IN ('free_trial', 'percentage', 'fixed')),
  discount_value INTEGER DEFAULT 0, -- For free_trial: months, for percentage: percent, for fixed: amount in cents
  
  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0 NOT NULL CHECK (used_count >= 0),
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for code lookups
CREATE INDEX idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX idx_coupon_codes_active ON coupon_codes(is_active, valid_from, valid_until);

-- User coupon usage tracking (prevent duplicate uses)
CREATE TABLE IF NOT EXISTS user_coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL REFERENCES coupon_codes(code) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate uses
  UNIQUE(user_id, coupon_code)
);

-- Index for user coupon lookups
CREATE INDEX idx_user_coupon_usage_user_id ON user_coupon_usage(user_id);
CREATE INDEX idx_user_coupon_usage_coupon_code ON user_coupon_usage(coupon_code);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for coupon_codes (public read for active coupons)
CREATE POLICY "Anyone can view active coupon codes"
  ON coupon_codes FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- RLS Policies for user_coupon_usage
CREATE POLICY "Users can view their own coupon usage"
  ON user_coupon_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coupon usage"
  ON user_coupon_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON coupon_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert the "cursor" coupon code for Super Plus 1 month free trial
INSERT INTO coupon_codes (code, description, tier, discount_type, discount_value, max_uses, is_active, valid_until)
VALUES (
  'cursor',
  'Free 1 month Super Plus trial',
  'super_plus',
  'free_trial',
  1, -- 1 month
  NULL, -- Unlimited uses
  true,
  NULL -- No expiration
) ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    tier = EXCLUDED.tier,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    is_active = EXCLUDED.is_active;
