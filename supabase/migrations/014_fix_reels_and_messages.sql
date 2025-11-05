-- =====================================================
-- FIX REELS AND MESSAGES ISSUES
-- 1. Add 'transaction' to message_type constraint
-- 2. Add foreign key from reels.user_id to profiles.id for proper joins
-- =====================================================

-- =====================================================
-- 1. Fix message_type constraint
-- =====================================================
-- Step 1: Drop old constraint first (to allow updates)
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Step 2: Update any invalid or NULL message_type values to 'text' (default)
-- This handles any existing data that doesn't match the new constraint
UPDATE public.messages 
SET message_type = 'text'
WHERE message_type IS NULL 
   OR message_type NOT IN ('text', 'image', 'system', 'transaction');

-- Step 4: Add new constraint with 'transaction' included
ALTER TABLE public.messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'system', 'transaction'));

-- =====================================================
-- 2. Add transaction_id column to messages if it doesn't exist
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;
    
    -- Add index for transaction_id
    CREATE INDEX IF NOT EXISTS idx_messages_transaction_id ON public.messages(transaction_id);
  END IF;
END $$;

-- =====================================================
-- NOTE: Reels query has been fixed in reel.service.ts
-- Instead of using PostgREST relationship syntax, we now
-- batch fetch profiles separately for better compatibility
-- =====================================================

-- =====================================================
-- COMPLETED! 🎉
-- =====================================================

