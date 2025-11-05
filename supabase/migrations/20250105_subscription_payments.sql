-- Create subscription_payments table to track payment transactions
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'premium', 'pro')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'vnd',
  payment_intent_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_payments_profile_id ON subscription_payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_intent_id ON subscription_payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

-- Enable Row Level Security (RLS)
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payment records
CREATE POLICY "Users can view own payment records"
  ON subscription_payments FOR SELECT
  USING (auth.uid() = profile_id);

-- Service role can insert payment records (for edge functions)
CREATE POLICY "Service role can insert payment records"
  ON subscription_payments FOR INSERT
  WITH CHECK (true);

-- Service role can update payment records (for webhooks)
CREATE POLICY "Service role can update payment records"
  ON subscription_payments FOR UPDATE
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_payments_updated_at();

-- Add comment
COMMENT ON TABLE subscription_payments IS 'Tracks Stripe payment transactions for subscriptions';
