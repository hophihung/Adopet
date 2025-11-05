/**
 * Supabase Client Configuration
 * Kết nối với Supabase và sử dụng AsyncStorage để lưu session
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Thay thế bằng URL và ANON_KEY của bạn từ Supabase Dashboard
// Truy cập: https://app.supabase.com/project/YOUR_PROJECT/settings/api
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Tạo Supabase client với AsyncStorage để persist session
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Không detect session từ URL (mobile app)
  },
});

// Type definitions cho database
export type Profile = {
  id: string;
  role: 'user' | 'seller';
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Pet = {
  id: string;
  seller_id: string;
  name: string;
  type: 'dog' | 'cat' | 'hamster' | 'bird' | 'rabbit' | 'other';
  age_months: number | null;
  gender: 'male' | 'female' | 'unknown' | null;
  description: string | null;
  location: string | null;
  price: number | null;
  images: string[] | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  breed?: string | null;
  weight_kg?: number | null;
  color?: string | null;
  health_status?: 'healthy' | 'sick' | 'vaccinated' | 'needs_attention' | null;
  vaccination_status?: 'up_to_date' | 'partial' | 'not_vaccinated' | 'unknown' | null;
  spayed_neutered?: boolean | null;
  microchipped?: boolean | null;
  house_trained?: boolean | null;
  good_with_kids?: boolean | null;
  good_with_pets?: boolean | null;
  energy_level?: 'low' | 'medium' | 'high' | null;
  size?: 'small' | 'medium' | 'large' | 'extra_large' | null;
  special_needs?: string | null;
  adoption_fee?: number | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  view_count?: number;
  like_count?: number;
  is_featured?: boolean;
  featured_until?: string | null;
  last_viewed_at?: string | null;
};

export type Match = {
  id: string;
  user_id: string;
  pet_id: string;
  liked: boolean;
  created_at: string;
};

export type PetLike = {
  id: string;
  pet_id: string;
  user_id: string;
  created_at: string;
};

export type PetView = {
  id: string;
  pet_id: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  viewed_at: string;
};

export type Reel = {
  id: string;
  pet_id: string | null;
  seller_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
};

export type Subscription = {
  id: string;
  profile_id: string;
  plan: 'free' | 'premium' | 'pro';
  status: 'active' | 'canceled' | 'expired';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type VirtualPet = {
  id: string;
  user_id: string;
  pet_type: 'cat' | 'dog' | 'bird';
  name: string;
  level: number;
  exp: number;
  exp_to_next_level: number;
  mood: number; // 0-100
  last_checkin_date: string | null;
  streak_days: number;
  skin_id: string;
  background_id: string;
  created_at: string;
  updated_at: string;
};