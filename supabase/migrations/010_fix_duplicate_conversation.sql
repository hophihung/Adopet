-- =====================================================
-- FIX: Prevent duplicate conversation error when liking multiple pets from same seller
-- =====================================================

-- Recreate the trigger function to handle existing conversations properly
-- Ensure message_type supports 'pet_like'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.messages'::regclass
      AND contype = 'c'
      AND conname ILIKE '%message_type%'
  ) THEN
    EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT ' || quote_ident(
      (SELECT conname FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND contype = 'c' AND conname ILIKE '%message_type%' LIMIT 1)
    );
  END IF;
EXCEPTION WHEN others THEN NULL;
END$$;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'system', 'pet_like'));

CREATE OR REPLACE FUNCTION create_conversation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  pet_record RECORD;
  conversation_id uuid;
  existing_conv_id uuid;
BEGIN
  -- Fetch pet and seller info
  SELECT p.id,
         p.seller_id,
         p.name,
         p.type,
         p.price,
         COALESCE(p.images[1], NULL) AS thumb
  INTO pet_record
  FROM public.pets p
  WHERE p.id = NEW.pet_id;

  -- Check if conversation already exists (buyer NEW.user_id, seller pet.seller_id)
  SELECT id INTO existing_conv_id
  FROM public.conversations
  WHERE (buyer_id = NEW.user_id AND seller_id = pet_record.seller_id)
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    conversation_id := existing_conv_id;
  ELSE
    -- Upsert to guarantee an id is returned
    INSERT INTO public.conversations (pet_id, buyer_id, seller_id)
    VALUES (NEW.pet_id, NEW.user_id, pet_record.seller_id)
    ON CONFLICT (buyer_id, seller_id) WHERE (is_active)
    DO UPDATE SET
      pet_id = COALESCE(public.conversations.pet_id, EXCLUDED.pet_id),
      updated_at = now()
    RETURNING id INTO conversation_id;

    -- Absolute safeguard: re-select if somehow still null
    IF conversation_id IS NULL THEN
      SELECT id INTO conversation_id
      FROM public.conversations
      WHERE buyer_id = NEW.user_id
        AND seller_id = pet_record.seller_id
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- Insert a rich 'pet_like' message with meta (only if conversation exists)
  IF conversation_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve conversation_id for like (pet_id %, user_id %)', NEW.pet_id, NEW.user_id;
  END IF;

  -- Insert a rich 'pet_like' message with meta
  INSERT INTO public.messages (conversation_id, sender_id, content, message_type, meta)
  VALUES (
    conversation_id,
    NEW.user_id,
    'đã quan tâm một thú cưng',
    'pet_like',
    jsonb_build_object(
      'pet_id', pet_record.id,
      'name', pet_record.name,
      'type', pet_record.type,
      'price', pet_record.price,
      'thumb', pet_record.thumb
    )
  );

  -- Create notification for seller with pet preview
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    pet_record.seller_id,
    'pet_liked',
    'Có người quan tâm thú cưng của bạn',
    COALESCE(pet_record.name, 'Thú cưng') || ' vừa được thích',
    jsonb_build_object(
      'pet_id', pet_record.id,
      'buyer_id', NEW.user_id,
      'conversation_id', conversation_id,
      'thumb', pet_record.thumb,
      'name', pet_record.name,
      'type', pet_record.type
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

