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
};

export type Match = {
  id: string;
  user_id: string;
  pet_id: string;
  liked: boolean;
  created_at: string;
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
