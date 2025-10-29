-- =====================================================
-- CREATE CHAT SYSTEM FOR PET LIKES
-- Real-time chat between users and sellers when pet is liked
-- =====================================================

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(pet_id, buyer_id) -- One conversation per pet per buyer
);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  read_at timestamptz
);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('pet_liked', 'new_message', 'match')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb, -- Additional data like pet_id, conversation_id, etc.
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_pet_id ON public.conversations(pet_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 5. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- 7. RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- 8. RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- 9. Functions for auto-creating conversations and notifications
CREATE OR REPLACE FUNCTION create_conversation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  pet_seller_id uuid;
  conversation_exists boolean;
  conversation_id uuid;
BEGIN
  -- Get the seller of the pet
  SELECT seller_id INTO pet_seller_id
  FROM public.pets
  WHERE id = NEW.pet_id;
  
  -- Check if conversation already exists
  SELECT EXISTS(
    SELECT 1 FROM public.conversations 
    WHERE pet_id = NEW.pet_id AND buyer_id = NEW.user_id
  ) INTO conversation_exists;
  
  -- Create conversation if it doesn't exist
  IF NOT conversation_exists THEN
    INSERT INTO public.conversations (pet_id, buyer_id, seller_id)
    VALUES (NEW.pet_id, NEW.user_id, pet_seller_id)
    RETURNING id INTO conversation_id;
    
    -- Create notification for seller
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      pet_seller_id,
      'pet_liked',
      'Someone liked your pet!',
      'A user is interested in your pet and wants to chat.',
      jsonb_build_object('pet_id', NEW.pet_id, 'buyer_id', NEW.user_id, 'conversation_id', conversation_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger to create conversation when pet is liked
DROP TRIGGER IF EXISTS trigger_create_conversation_on_like ON public.pet_likes;
CREATE TRIGGER trigger_create_conversation_on_like
  AFTER INSERT ON public.pet_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_like();

-- 11. Function to update conversation when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation's last_message_at and updated_at
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  -- Create notification for the other user
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT 
    CASE 
      WHEN c.buyer_id = NEW.sender_id THEN c.seller_id
      ELSE c.buyer_id
    END,
    'new_message',
    'New message',
    LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger to update conversation when message is sent
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- 13. Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  conversation_id_param uuid,
  user_id_param uuid
)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_read = true, read_at = now()
  WHERE conversation_id = conversation_id_param
    AND sender_id != user_id_param
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 15. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
