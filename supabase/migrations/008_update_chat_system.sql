-- =====================================================
-- UPDATE CHAT SYSTEM: one conversation per buyer-seller
-- and system message + notification on pet like
-- =====================================================

-- 1) Make conversations.pet_id optional (nullable)
ALTER TABLE public.conversations
  ALTER COLUMN pet_id DROP NOT NULL;

-- 2) Drop old unique (pet_id, buyer_id) if it exists and add new unique on (buyer_id, seller_id)
DO $$
BEGIN
  -- Drop unnamed unique constraint by finding it dynamically
  IF EXISTS (
    SELECT 1
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'conversations' 
      AND indexdef ILIKE '%UNIQUE% (pet_id, buyer_id%'
  ) THEN
    EXECUTE (
      SELECT 'DROP INDEX IF EXISTS ' || quote_ident(indexname)
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'conversations'
        AND indexdef ILIKE '%UNIQUE% (pet_id, buyer_id%'
      LIMIT 1
    );
  END IF;
EXCEPTION WHEN others THEN NULL;
END$$;

-- Ensure new unique for buyer-seller pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
  ON public.conversations(buyer_id, seller_id)
  WHERE is_active = true;

-- 3) Recreate function to create (or reuse) conversation on like
CREATE OR REPLACE FUNCTION create_conversation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  pet_seller_id uuid;
  conversation_id uuid;
BEGIN
  -- Get the seller of the pet
  SELECT seller_id INTO pet_seller_id
  FROM public.pets
  WHERE id = NEW.pet_id;

  -- Try to find existing conversation between buyer and seller
  SELECT id INTO conversation_id
  FROM public.conversations
  WHERE buyer_id = NEW.user_id
    AND seller_id = pet_seller_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create conversation if it doesn't exist
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (pet_id, buyer_id, seller_id)
    VALUES (NEW.pet_id, NEW.user_id, pet_seller_id)
    RETURNING id INTO conversation_id;
  END IF;

  -- System message to indicate which pet was liked
  INSERT INTO public.messages (conversation_id, sender_id, content, message_type)
  VALUES (
    conversation_id,
    NEW.user_id,
    'đã thích pet với ID: ' || NEW.pet_id::text,
    'system'
  );

  -- Create notification for seller
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    pet_seller_id,
    'pet_liked',
    'Pet của bạn vừa được thích',
    'Một người dùng quan tâm đến pet của bạn. Nhấn để trò chuyện.',
    jsonb_build_object('pet_id', NEW.pet_id, 'buyer_id', NEW.user_id, 'conversation_id', conversation_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


