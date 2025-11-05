-- =====================================================
-- CHAT ENHANCEMENT: single thread per buyer-seller, rich pet-like message
-- Adds meta jsonb to messages and enriches like trigger to send pet preview
-- =====================================================

-- 1) Add meta column to messages (for rich payloads like pet preview)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- 2) Recreate function to create (or reuse) conversation on like
--    and push a 'pet_like' message with pet preview metadata
CREATE OR REPLACE FUNCTION create_conversation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  pet_record RECORD;
  conversation_id uuid;
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

  -- Reuse or create conversation (buyer NEW.user_id, seller pet.seller_id)
  SELECT id INTO conversation_id
  FROM public.conversations
  WHERE buyer_id = NEW.user_id
    AND seller_id = pet_record.seller_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (pet_id, buyer_id, seller_id)
    VALUES (NEW.pet_id, NEW.user_id, pet_record.seller_id)
    RETURNING id INTO conversation_id;
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

  -- Create notification for seller with pet preview (ảnh, tên, giá)
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
      'images', (SELECT images FROM public.pets WHERE id = pet_record.id),
      'name', pet_record.name,
      'type', pet_record.type,
      'price', pet_record.price
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


