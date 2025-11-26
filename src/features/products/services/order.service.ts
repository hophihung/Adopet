import { supabase } from '@/lib/supabase';

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  shipping_fee: number;
  final_price: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city?: string;
  shipping_district?: string;
  shipping_ward?: string;
  shipping_note?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'cod' | 'bank_transfer' | 'e_wallet';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_transaction_id?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  buyer_note?: string;
  seller_note?: string;
  cancellation_reason?: string;
  tracking_number?: string;
  escrow_account_id?: string;
  escrow_status?: 'none' | 'escrowed' | 'released' | 'refunded' | 'disputed';
  commission_id?: string;
  platform_fee?: number;
  seller_payout?: number;
  payos_payment_link_id?: string;
  payos_order_code?: string;
  product?: {
    id: string;
    name: string;
    image_url?: string;
    price: number;
  };
}

export interface CreateOrderInput {
  product_id: string;
  quantity: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city?: string;
  shipping_district?: string;
  shipping_ward?: string;
  shipping_note?: string;
  payment_method?: 'cod' | 'bank_transfer' | 'e_wallet';
  buyer_note?: string;
}

export class OrderService {
  // Create order
  static async create(input: CreateOrderInput, buyerId: string): Promise<Order> {
    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id, price, shipping_fee, stock_quantity, is_available')
      .eq('id', input.product_id)
      .single();

    if (productError || !product) {
      throw new Error('Sản phẩm không tồn tại');
    }

    if (!product.is_available) {
      throw new Error('Sản phẩm hiện không có sẵn');
    }

    if (product.stock_quantity < input.quantity) {
      throw new Error(`Chỉ còn ${product.stock_quantity} sản phẩm trong kho`);
    }

    const unitPrice = product.price;
    const totalPrice = unitPrice * input.quantity;
    const shippingFee = product.shipping_fee || 0;
    const finalPrice = totalPrice + shippingFee;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        seller_id: product.seller_id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        shipping_fee: shippingFee,
        final_price: finalPrice,
        shipping_name: input.shipping_name,
        shipping_phone: input.shipping_phone,
        shipping_address: input.shipping_address,
        shipping_city: input.shipping_city,
        shipping_district: input.shipping_district,
        shipping_ward: input.shipping_ward,
        shipping_note: input.shipping_note,
        payment_method: input.payment_method || 'cod',
        buyer_note: input.buyer_note,
      })
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Get orders by buyer
  static async getByBuyer(buyerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get orders by seller
  static async getBySeller(sellerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get single order
  static async getById(orderId: string, userId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, image_url, price, description)
      `)
      .eq('id', orderId)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Update tracking number (seller only)
  static async updateTracking(
    orderId: string,
    trackingNumber: string,
    sellerId: string
  ): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        seller_note: `Mã vận đơn: ${trackingNumber}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('seller_id', sellerId)
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Update order status (seller only)
  static async updateStatus(
    orderId: string,
    status: Order['status'],
    sellerId: string,
    sellerNote?: string
  ): Promise<Order> {
    const updateData: any = { status };
    if (sellerNote) {
      updateData.seller_note = sellerNote;
    }
    
    // Update timestamp based on status
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('seller_id', sellerId)
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .single();

    if (error) throw error;

    // If order is delivered and has escrow, release escrow and create payout
    if (status === 'delivered' && data.escrow_account_id) {
      try {
        // Release escrow
        await supabase.rpc('release_escrow_to_seller', {
          escrow_account_id_param: data.escrow_account_id,
        });

        // Create payout record
        await supabase.rpc('create_payout_record', {
          escrow_account_id_param: data.escrow_account_id,
          payout_method_param: 'bank_transfer',
        });
      } catch (payoutError) {
        console.error('Error creating payout:', payoutError);
        // Don't throw error, just log - payout can be created manually later
      }
    }

    return data;
  }

  // Cancel order (buyer only, pending orders)
  static async cancel(
    orderId: string,
    buyerId: string,
    reason?: string
  ): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
      })
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .eq('status', 'pending')
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .single();

    if (error) throw error;
    return data;
  }
}

