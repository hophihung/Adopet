import { supabase } from '@/lib/supabase';

export interface EscrowDispute {
  id: string;
  escrow_account_id: string;
  order_id?: string;
  transaction_id?: string;
  opened_by: string;
  buyer_id: string;
  seller_id: string;
  dispute_type: 'product_not_received' | 'product_damaged' | 'product_not_as_described' | 'seller_not_responding' | 'other';
  reason: string;
  description: string;
  evidence_urls?: string[];
  status: 'open' | 'under_review' | 'resolved' | 'closed' | 'cancelled';
  resolved_by?: string;
  resolution?: string;
  resolution_type?: 'refund_buyer' | 'release_to_seller' | 'partial_refund' | 'no_action';
  resolution_amount?: number;
  opened_at: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  attachments?: string[];
  message_type: 'user' | 'admin' | 'system';
  created_at: string;
  deleted_at?: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface CreateDisputeInput {
  escrow_account_id: string;
  order_id?: string;
  transaction_id?: string;
  dispute_type: EscrowDispute['dispute_type'];
  reason: string;
  description: string;
  evidence_urls?: string[];
}

export class DisputeService {
  // Create dispute
  static async create(input: CreateDisputeInput, openedBy: string): Promise<EscrowDispute> {
    // Get escrow account to verify ownership
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_accounts')
      .select('buyer_id, seller_id, status')
      .eq('id', input.escrow_account_id)
      .single();

    if (escrowError || !escrow) {
      throw new Error('Escrow account not found');
    }

    if (escrow.status === 'disputed') {
      throw new Error('Dispute already exists for this escrow');
    }

    if (openedBy !== escrow.buyer_id && openedBy !== escrow.seller_id) {
      throw new Error('Unauthorized to open dispute');
    }

    // Create dispute
    const { data, error } = await supabase
      .from('escrow_disputes')
      .insert({
        escrow_account_id: input.escrow_account_id,
        order_id: input.order_id,
        transaction_id: input.transaction_id,
        opened_by: openedBy,
        buyer_id: escrow.buyer_id,
        seller_id: escrow.seller_id,
        dispute_type: input.dispute_type,
        reason: input.reason,
        description: input.description,
        evidence_urls: input.evidence_urls || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get disputes by user
  static async getByUser(userId: string): Promise<EscrowDispute[]> {
    const { data, error } = await supabase
      .from('escrow_disputes')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get dispute by ID
  static async getById(disputeId: string, userId: string): Promise<EscrowDispute | null> {
    const { data, error } = await supabase
      .from('escrow_disputes')
      .select('*')
      .eq('id', disputeId)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Get dispute messages
  static async getMessages(disputeId: string): Promise<DisputeMessage[]> {
    const { data, error } = await supabase
      .from('dispute_messages')
      .select(`
        *,
        sender:profiles!dispute_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .eq('dispute_id', disputeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Add message to dispute
  static async addMessage(
    disputeId: string,
    senderId: string,
    message: string,
    attachments?: string[]
  ): Promise<DisputeMessage> {
    // Verify user is part of dispute
    const dispute = await this.getById(disputeId, senderId);
    if (!dispute) {
      throw new Error('Dispute not found or unauthorized');
    }

    const { data, error } = await supabase
      .from('dispute_messages')
      .insert({
        dispute_id: disputeId,
        sender_id: senderId,
        message,
        attachments: attachments || [],
      })
      .select(`
        *,
        sender:profiles!dispute_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Admin: Resolve dispute
  static async resolve(
    disputeId: string,
    adminId: string,
    resolution: string,
    resolutionType: EscrowDispute['resolution_type'],
    resolutionAmount?: number
  ): Promise<EscrowDispute> {
    // Note: In production, verify admin role
    const { data, error } = await supabase
      .from('escrow_disputes')
      .update({
        status: 'resolved',
        resolved_by: adminId,
        resolution,
        resolution_type: resolutionType,
        resolution_amount: resolutionAmount,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) throw error;

    // Execute resolution (refund or release)
    if (resolutionType === 'refund_buyer' || resolutionType === 'partial_refund') {
      // Call refund function
      await supabase.rpc('refund_escrow_to_buyer', {
        escrow_account_id_param: data.escrow_account_id,
        refund_amount_param: resolutionAmount || null,
      });
    } else if (resolutionType === 'release_to_seller') {
      // Call release function
      await supabase.rpc('release_escrow_to_seller', {
        escrow_account_id_param: data.escrow_account_id,
      });
    }

    return data;
  }
}

