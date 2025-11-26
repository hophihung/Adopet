import { supabase } from '@/lib/supabase';

export interface ProductReview {
  id: string;
  order_id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  rating: number;
  title?: string;
  comment?: string;
  image_urls?: string[];
  status: 'active' | 'hidden' | 'deleted';
  seller_response?: string;
  seller_response_at?: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  buyer?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface CreateReviewInput {
  order_id: string;
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
  image_urls?: string[];
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reported_by: string;
  reason: 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportInput {
  review_id: string;
  reason: ReviewReport['reason'];
  description?: string;
}

export type ReviewFilter = 'all' | 'highest' | 'lowest' | 'most_helpful' | 'recent';

export class ReviewService {
  // Create review
  static async create(input: CreateReviewInput, buyerId: string): Promise<ProductReview> {
    // Verify order belongs to buyer and is delivered
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('seller_id, status')
      .eq('id', input.order_id)
      .eq('buyer_id', buyerId)
      .eq('status', 'delivered')
      .single();

    if (orderError || !order) {
      throw new Error('Order not found or not eligible for review');
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('order_id', input.order_id)
      .single();

    if (existingReview) {
      throw new Error('Review already exists for this order');
    }

    // Create review
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        order_id: input.order_id,
        product_id: input.product_id,
        buyer_id: buyerId,
        seller_id: order.seller_id,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        image_urls: input.image_urls || [],
      })
      .select(`
        *,
        buyer:profiles!product_reviews_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Get reviews by product with filtering
  static async getByProduct(
    productId: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: ReviewFilter;
    }
  ): Promise<ProductReview[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const filter = options?.filter || 'recent';

    let query = supabase
      .from('product_reviews')
      .select(`
        *,
        buyer:profiles!product_reviews_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .eq('product_id', productId)
      .eq('status', 'active');

    // Apply filter
    switch (filter) {
      case 'highest':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true });
        break;
      case 'most_helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'recent':
      case 'all':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get review by ID
  static async getById(reviewId: string): Promise<ProductReview | null> {
    const { data, error } = await supabase
      .from('product_reviews')
      .select(`
        *,
        buyer:profiles!product_reviews_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .eq('id', reviewId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Get review by order
  static async getByOrder(orderId: string): Promise<ProductReview | null> {
    const { data, error } = await supabase
      .from('product_reviews')
      .select(`
        *,
        buyer:profiles!product_reviews_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .eq('order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Update review (buyer only)
  static async update(
    reviewId: string,
    buyerId: string,
    updates: { rating?: number; title?: string; comment?: string; image_urls?: string[] }
  ): Promise<ProductReview> {
    const { data, error } = await supabase
      .from('product_reviews')
      .update(updates)
      .eq('id', reviewId)
      .eq('buyer_id', buyerId)
      .select(`
        *,
        buyer:profiles!product_reviews_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Seller response to review
  static async addSellerResponse(
    reviewId: string,
    sellerId: string,
    response: string
  ): Promise<ProductReview> {
    const { data, error } = await supabase
      .from('product_reviews')
      .update({
        seller_response: response,
        seller_response_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('seller_id', sellerId)
      .select(`
        *,
        buyer:profiles!product_reviews_buyer_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Vote helpful
  static async voteHelpful(reviewId: string, userId: string, isHelpful: boolean): Promise<void> {
    const { error } = await supabase
      .from('review_helpful_votes')
      .upsert({
        review_id: reviewId,
        user_id: userId,
        is_helpful: isHelpful,
      }, {
        onConflict: 'review_id,user_id',
      });

    if (error) throw error;
  }

  // Report review
  static async reportReview(input: CreateReportInput, userId: string): Promise<ReviewReport> {
    const { data, error } = await supabase
      .from('review_reports')
      .insert({
        review_id: input.review_id,
        reported_by: userId,
        reason: input.reason,
        description: input.description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Check if user has reported this review
  static async hasReported(reviewId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('review_reports')
      .select('id')
      .eq('review_id', reviewId)
      .eq('reported_by', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
}

