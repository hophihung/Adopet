import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { router } from 'expo-router';

interface Profile {
  id: string;
  role: 'user' | 'seller';
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  createProfile: (role: 'user' | 'seller') => Promise<'user' | 'seller'>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Load onboarding status
    const loadOnboardingStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('onboarding_completed');
        setHasCompletedOnboarding(status === 'true');
      } catch (error) {
        console.error('Error loading onboarding status:', error);
      }
    };

    loadOnboardingStatus();

    // Timeout fallback to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth loading timeout - setting loading to false');
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      clearTimeout(timeout);
      console.error('Error getting session:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setHasCompletedOnboarding(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data);
      
      // Nếu là seller và chưa có subscription, đảm bảo tạo free subscription
      if (data && data.role === 'seller') {
        try {
          await supabase.rpc('ensure_seller_has_subscription', {
            user_profile_id: userId
          });
        } catch (subscriptionError) {
          console.error('Error ensuring seller subscription:', subscriptionError);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('🔵 Sign-in data:', data);
    console.log('🔵 Sign-in error:', error);

    if (error) throw error;

    // Nếu muốn phản hồi UI ngay khi đăng nhập thành công:
    if (data?.session?.user) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchProfile(data.session.user.id);
      router.replace('/(tabs)/discover/match' as any);
    }

    setLoading(false);
  };


  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    console.log('🔵 Starting Google OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'petadoption://auth/callback',
      },
    });
    console.log('🔵 OAuth Data:', data);
    if (error) {
      console.error('🔴 Google OAuth Error:', error);
      throw error;
    }
  };

  const signInWithFacebook = async () => {
    console.log('🔵 Starting Facebook OAuth...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: 'petadoption://auth/callback',
      },
    });
    console.log('🔵 OAuth Data:', data);
    if (error) {
      console.error('🔴 Facebook OAuth Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const createProfile = async (role: 'user' | 'seller') => {
    if (!user) throw new Error('No user found');

    console.log('🔵 Creating profile with role:', role);

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      role,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    });

    if (error) {
      console.error('🔴 Error creating profile:', error);
      throw error;
    }

    console.log('🔵 Profile created successfully');

    // Reset onboarding when creating new profile
    await AsyncStorage.setItem('onboarding_completed', 'false');
    setHasCompletedOnboarding(false);

    await refreshProfile();
    
    console.log('🔵 Returning role:', role);
    // Return role để component có thể xử lý redirect
    return role;
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    hasCompletedOnboarding,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    createProfile,
    refreshProfile,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
