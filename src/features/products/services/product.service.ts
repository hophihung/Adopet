import { supabase } from '@/lib/supabase';

export interface ProductCategory {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  icon_url?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  currency: string;
  image_url?: string;
  image_urls?: string[];
  stock_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  shipping_fee: number;
  estimated_delivery_days: number;
  tags?: string[];
  views_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
}

export interface ReelProduct {
  id: string;
  reel_id: string;
  product_id: string;
  position_x: number;
  position_y: number;
  start_time?: number;
  end_time?: number;
  display_order: number;
  created_at: string;
  product?: Product;
}

export interface CreateProductInput {
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  currency?: string;
  image_url?: string;
  image_urls?: string[];
  stock_quantity?: number;
  is_available?: boolean;
  is_featured?: boolean;
  shipping_fee?: number;
  estimated_delivery_days?: number;
  tags?: string[];
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export class ProductService {
  // Get all categories
  static async getCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get products by seller
  static async getBySeller(sellerId: string, options?: {
    includeUnavailable?: boolean;
    categoryId?: string;
  }): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (!options?.includeUnavailable) {
      query = query.eq('is_available', true);
    }

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get single product
  static async getById(productId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  // Get available products (public)
  static async getAvailable(options?: {
    categoryId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Create product (seller only)
  static async create(input: CreateProductInput, sellerId: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        seller_id: sellerId,
        currency: input.currency || 'VND',
        stock_quantity: input.stock_quantity ?? 0,
        is_available: input.is_available ?? true,
        is_featured: input.is_featured ?? false,
        shipping_fee: input.shipping_fee ?? 0,
        estimated_delivery_days: input.estimated_delivery_days ?? 3,
      })
      .select(`
        *,
        category:product_categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Update product (seller only)
  static async update(input: UpdateProductInput, sellerId: string): Promise<Product> {
    const { id, ...updateData } = input;
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('seller_id', sellerId)
      .select(`
        *,
        category:product_categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Delete product (seller only)
  static async delete(productId: string, sellerId: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('seller_id', sellerId);

    if (error) throw error;
  }

  // Get products attached to a reel
  static async getByReel(reelId: string): Promise<ReelProduct[]> {
    const { data, error } = await supabase
      .from('reel_products')
      .select(`
        *,
        product:products(
          *,
          category:product_categories(*)
        )
      `)
      .eq('reel_id', reelId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Attach product to reel
  static async attachToReel(
    reelId: string,
    productId: string,
    options?: {
      position_x?: number;
      position_y?: number;
      start_time?: number;
      end_time?: number;
      display_order?: number;
    }
  ): Promise<ReelProduct> {
    const { data, error } = await supabase
      .from('reel_products')
      .insert({
        reel_id: reelId,
        product_id: productId,
        position_x: options?.position_x ?? 50,
        position_y: options?.position_y ?? 50,
        start_time: options?.start_time,
        end_time: options?.end_time,
        display_order: options?.display_order ?? 0,
      })
      .select(`
        *,
        product:products(
          *,
          category:product_categories(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Remove product from reel
  static async removeFromReel(reelId: string, reelProductId: string): Promise<void> {
    const { error } = await supabase
      .from('reel_products')
      .delete()
      .eq('id', reelProductId)
      .eq('reel_id', reelId);

    if (error) throw error;
  }

  // Update reel product position
  static async updateReelProduct(
    reelProductId: string,
    updates: {
      position_x?: number;
      position_y?: number;
      start_time?: number;
      end_time?: number;
      display_order?: number;
    }
  ): Promise<ReelProduct> {
    const { data, error } = await supabase
      .from('reel_products')
      .update(updates)
      .eq('id', reelProductId)
      .select(`
        *,
        product:products(
          *,
          category:product_categories(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Increment product views
  static async incrementViews(productId: string): Promise<void> {
    await supabase.rpc('increment_product_views', {
      product_uuid: productId,
    });
  }
}

