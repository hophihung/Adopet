import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Payout to Seller
 * Chuyển tiền từ merchant account của Adopet → seller
 * 
 * Có thể implement bằng:
 * 1. PayOS Payout API (nếu có)
 * 2. Bank transfer manual
 * 3. Tích hợp payment gateway khác
 * 
 * Hiện tại: Chỉ update database, thực tế cần manual transfer hoặc tích hợp API
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { escrow_account_id, payout_method = 'bank_transfer' } = await req.json();

    if (!escrow_account_id) {
      return new Response(
        JSON.stringify({ error: 'Missing escrow_account_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get escrow account details
    const { data: escrowAccount, error: escrowError } = await supabase
      .from('escrow_accounts')
      .select(`
        *,
        commission:platform_commissions(seller_payout_amount, total_platform_fee)
      `)
      .eq('id', escrow_account_id)
      .single();

    if (escrowError || !escrowAccount) {
      return new Response(
        JSON.stringify({ error: 'Escrow account not found', details: escrowError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (escrowAccount.status !== 'escrowed') {
      return new Response(
        JSON.stringify({ 
          error: 'Escrow account is not in escrowed status',
          current_status: escrowAccount.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get seller payout amount from commission
    const commission = escrowAccount.commission;
    if (!commission || !Array.isArray(commission) || commission.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Commission record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sellerPayoutAmount = commission[0].seller_payout_amount;
    const platformFee = commission[0].total_platform_fee;

    // Get seller bank account info (cần thêm bảng seller_bank_accounts)
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', escrowAccount.seller_id)
      .single();

    if (!sellerProfile) {
      return new Response(
        JSON.stringify({ error: 'Seller profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Release escrow in database
    const { error: releaseError } = await supabase.rpc('release_escrow_to_seller', {
      escrow_account_id_param: escrow_account_id,
    });

    if (releaseError) {
      console.error('Error releasing escrow:', releaseError);
      return new Response(
        JSON.stringify({ error: 'Failed to release escrow', details: releaseError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payout record
    const { data: payoutId, error: payoutError } = await supabase.rpc('create_payout_record', {
      escrow_account_id_param: escrow_account_id,
      payout_method_param: payout_method,
    });

    if (payoutError) {
      console.error('Error creating payout record:', payoutError);
      // Continue anyway - payout record can be created manually
    }

    // Try to process payout via API (if available)
    let externalTransactionId: string | null = null;
    let payoutStatus = 'pending_manual';

    if (payout_method === 'payos_payout') {
      // TODO: Implement PayOS Payout API
      // const payosPayout = await PayOSPayoutService.createPayout({...});
      // externalTransactionId = payosPayout.transaction_id;
      // payoutStatus = payosPayout.status;
      console.log('PayOS Payout API not available - using manual transfer');
    } else if (payout_method === 'bank_transfer') {
      // TODO: Implement bank transfer API
      // const bankTransfer = await BankTransferPayoutService.createPayout({...});
      // externalTransactionId = bankTransfer.transaction_id;
      // payoutStatus = bankTransfer.status;
      console.log('Bank transfer API not integrated - using manual transfer');
    }

    // Log payout request for admin to process manually
    console.log('Payout Request (Manual Processing Required):', {
      escrow_account_id,
      payout_id: payoutId,
      seller_id: escrowAccount.seller_id,
      seller_name: sellerProfile.full_name,
      seller_email: sellerProfile.email,
      payout_amount: sellerPayoutAmount,
      platform_fee: platformFee,
      payout_method,
      bank_account: {
        bank_name: bankAccount?.bank_name,
        account_number: bankAccount?.account_number,
        account_holder_name: bankAccount?.account_holder_name,
      },
      timestamp: new Date().toISOString(),
    });

    // If payout record was created, update with external transaction ID if available
    if (payoutId && externalTransactionId) {
      await supabase.rpc('update_payout_status', {
        payout_id_param: payoutId,
        status_param: payoutStatus === 'completed' ? 'completed' : 'processing',
        external_transaction_id_param: externalTransactionId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Escrow released. Payout logged for manual processing.',
        payout_details: {
          escrow_account_id,
          seller_id: escrowAccount.seller_id,
          seller_name: sellerProfile.full_name,
          payout_amount: sellerPayoutAmount,
          platform_fee: platformFee,
          payout_method,
          status: 'pending_manual_transfer', // Cần admin chuyển tiền thủ công
        },
        note: 'In production, integrate with PayOS Payout API or bank transfer API for automatic payout.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing payout:', error);
    return new Response(
      JSON.stringify({ error: 'Payout processing failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


