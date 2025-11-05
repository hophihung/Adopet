-- =====================================================
-- FIX NULL CONVERSATION_ID IN PET LIKE TRIGGER
-- Add validation to ensure conversation_id is not null before inserting message
-- =====================================================

CREATE OR REPLACE FUNCTION create_conversation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  pet_record RECORD;
  conversation_id uuid;
BEGIN
  -- Fetch pet info with full details: images, name, price
  SELECT p.id,
         p.seller_id,
         p.name,
         p.type,
         p.price,
         p.images,
         COALESCE(p.images[1], NULL) AS thumb
  INTO pet_record
  FROM public.pets p
  WHERE p.id = NEW.pet_id;

  -- Reuse or create conversation (buyer NEW.user_id, seller pet.seller_id)
  -- Handle race conditions by trying to insert first, catching unique violation
  BEGIN
    -- Try to get existing conversation first (for performance)
    SELECT id INTO conversation_id
    FROM public.conversations
    WHERE buyer_id = NEW.user_id
      AND seller_id = pet_record.seller_id
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no conversation exists, try to insert
    IF conversation_id IS NULL THEN
      BEGIN
        INSERT INTO public.conversations (pet_id, buyer_id, seller_id)
        VALUES (NEW.pet_id, NEW.user_id, pet_record.seller_id)
        RETURNING id INTO conversation_id;
      EXCEPTION
        WHEN unique_violation THEN
          -- Another transaction created it, just get it
          SELECT id INTO conversation_id
          FROM public.conversations
          WHERE buyer_id = NEW.user_id
            AND seller_id = pet_record.seller_id
            AND is_active = true
          ORDER BY created_at DESC
          LIMIT 1;
      END;
    END IF;
  END;

  -- Only insert message if we have a valid conversation_id
  IF conversation_id IS NOT NULL THEN
    -- Insert a rich 'pet_like' message with meta
    INSERT INTO public.messages (conversation_id, sender_id, content, message_type, meta)
    VALUES (
      conversation_id,
      NEW.user_id,
      'đã quan tâm một thú cưng',
      'system',
      jsonb_build_object(
        'pet_id', pet_record.id,
        'name', pet_record.name,
        'type', pet_record.type,
        'price', pet_record.price,
        'thumb', pet_record.thumb,
        'images', pet_record.images
      )
    );

    -- Create notification for seller with full details: images, name, price
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      pet_record.seller_id,
      'pet_liked',
      'Có người quan tâm thú cưng của bạn',
      COALESCE(pet_record.name, 'Thú cưng') || ' - ' || 
      COALESCE(pet_record.price::text, '0') || ' VNĐ',
      jsonb_build_object(
        'pet_id', pet_record.id,
        'buyer_id', NEW.user_id,
        'conversation_id', conversation_id,
        'thumb', pet_record.thumb,
        'images', pet_record.images,
        'name', pet_record.name,
        'type', pet_record.type,
        'price', pet_record.price
      )
    );
  ELSE
    -- Log error if conversation_id is still null
    RAISE WARNING 'Failed to create or find conversation for like: pet_id=%, user_id=%', NEW.pet_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED! 🎉
-- Now the trigger will:
-- 1. Only insert message if conversation_id is valid
-- 2. Raise a warning if conversation creation fails
-- 3. Prevent null constraint violations
-- =====================================================
