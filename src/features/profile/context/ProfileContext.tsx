import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UpdateProfileInput, ProfileStats } from '../types/profile.types';
import { ProfileService } from '../../../features/posts/services/Profile.service';
import { useAuth } from '../../../../contexts/AuthContext';

interface ProfileContextType {
  profile: Profile | null;
  stats: ProfileStats | null;
  loading: boolean;
  refreshing: boolean;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  uploadAvatar: (file: { uri: string; type: string; name: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load profile and stats when user changes
  useEffect(() => {
    if (user?.id) {
      loadProfile();
    } else {
      setProfile(null);
      setStats(null);
      setLoading(false);
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [profileData, statsData] = await Promise.all([
        ProfileService.getProfile(user.id),
        ProfileService.getProfileStats(user.id),
      ]);

      setProfile(profileData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;

    try {
      setRefreshing(true);
      const [profileData, statsData] = await Promise.all([
        ProfileService.getProfile(user.id),
        ProfileService.getProfileStats(user.id),
      ]);

      setProfile(profileData);
      setStats(statsData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updateProfile = async (updates: UpdateProfileInput) => {
    if (!user?.id) throw new Error('No user found');

    try {
      const updatedProfile = await ProfileService.updateProfile(user.id, updates);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const uploadAvatar = async (file: { uri: string; type: string; name: string }) => {
    if (!user?.id) throw new Error('No user found');

    try {
      const avatarUrl = await ProfileService.uploadAvatar(user.id, file);
      await updateProfile({ avatar_url: avatarUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        stats,
        loading,
        refreshing,
        updateProfile,
        uploadAvatar,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

