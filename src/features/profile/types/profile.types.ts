export interface Profile {
  id: string;
  role: 'user' | 'seller';
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  subscription_id?: number | null;
}

export interface UpdateProfileInput {
  full_name?: string;
  avatar_url?: string;
}

export interface ProfileStats {
  matches: number;
  posts: number;
  favorites: number;
}

