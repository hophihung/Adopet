export interface Profile {
  id: string;
  role: 'user' | 'seller';
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  subscription_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  search_radius_km?: number | null;
}

export interface UpdateProfileInput {
  full_name?: string;
  avatar_url?: string;
  search_radius_km?: number;
}

export interface ProfileStats {
  matches: number;
  posts: number;
  favorites: number;
}

