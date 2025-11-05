import { supabase } from "@/lib/supabase";

export interface Transaction {
  id: string;
  conversation_id: string;
  pet_id: string;
  seller_id: string;
  buyer_id: string;
  transaction_code: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method?: string;
  payment_proof_url?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  confirmed_by?: string;
  pet?: {
    id: string;
    name: string;
    price: number;
    images: string[] | null;
  };
  seller?: {
    id: string;
    full_name: string;
    avatar_url: string;
    reputation_points: number;
    avatar_frame: string;
  };
  buyer?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface CreateTransactionInput {
  conversation_id: string;
  pet_id: string;
  amount: number;
  payment_method?: string;
}

export const TransactionService = {
  // Create a new transaction (seller sends transaction code)
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('User not authenticated');

    // Chỉ tạo transaction code nếu amount > 0 (không miễn phí)
    let transactionCode: string | null = null;
    if (input.amount > 0) {
      // Generate transaction code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_transaction_code');
      if (codeError) throw codeError;
      transactionCode = codeData || this.generateRandomCode();
    }

    // Get conversation to verify seller
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('seller_id, buyer_id')
      .eq('id', input.conversation_id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.seller_id !== user.user.id) {
      throw new Error('Only seller can create transaction');
    }

    // Create transaction
    // Nếu amount = 0, transaction_code sẽ là null (không cần code cho giao dịch miễn phí)
    const insertData: any = {
      conversation_id: input.conversation_id,
      pet_id: input.pet_id,
      seller_id: conversation.seller_id,
      buyer_id: conversation.buyer_id,
      amount: input.amount,
      payment_method: input.payment_method || 'bank_transfer',
      status: 'pending',
    };
    
    // Chỉ thêm transaction_code nếu có (amount > 0)
    if (transactionCode) {
      insertData.transaction_code = transactionCode;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(insertData)
      .select(`
        *,
        pet:pet_id (
          id,
          name,
          price,
          images
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url,
          reputation_points,
          avatar_frame
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Get transaction by ID
  async getTransaction(transactionId: string): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        pet:pet_id (
          id,
          name,
          price,
          images
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url,
          reputation_points,
          avatar_frame
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get transactions for a conversation
  async getConversationTransactions(conversationId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        pet:pet_id (
          id,
          name,
          price,
          images
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url,
          reputation_points,
          avatar_frame
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Confirm transaction (buyer confirms payment)
  async confirmTransaction(
    transactionId: string,
    paymentProofUrl?: string
  ): Promise<Transaction> {
    const { error } = await supabase.rpc('confirm_transaction', {
      transaction_id_param: transactionId,
      payment_proof_url_param: paymentProofUrl || null,
    });

    if (error) throw error;

    // Return updated transaction
    return this.getTransaction(transactionId);
  },

  // Cancel transaction
  async cancelTransaction(transactionId: string): Promise<Transaction> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('User not authenticated');

    // Get transaction to verify ownership
    const transaction = await this.getTransaction(transactionId);

    if (transaction.seller_id !== user.user.id && transaction.buyer_id !== user.user.id) {
      throw new Error('Unauthorized');
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select(`
        *,
        pet:pet_id (
          id,
          name,
          price,
          images
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url,
          reputation_points,
          avatar_frame
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Subscribe to transaction updates
  subscribeToTransactions(
    conversationId: string,
    onUpdate: (transaction: Transaction) => void
  ) {
    return supabase
      .channel(`transactions:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onUpdate(payload.new as Transaction);
        }
      )
      .subscribe();
  },

  // Helper function to generate random code (fallback)
  generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },
};

