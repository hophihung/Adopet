import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Edit, Heart, MessageCircle, Star } from 'lucide-react-native';
import { useProfile } from '../../src/features/profile/context/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { profile, stats, loading, refreshing, refreshProfile } = useProfile();
  const { signOut } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A75" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshProfile} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: profile?.avatar_url || 'https://via.placeholder.com/120'
              }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editButton}>
              <Edit size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>
            {profile?.full_name || 'Unknown User'}
          </Text>
          <Text style={styles.bio}>
            {profile?.email || 'No email'}
          </Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>
              {profile?.role === 'seller' ? '🏪 Seller' : '👤 User'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Heart size={20} color="#FF5A75" />
            <Text style={styles.statNumber}>{stats?.matches || 0}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statItem}>
            <MessageCircle size={20} color="#FF5A75" />
            <Text style={styles.statNumber}>{stats?.posts || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Star size={20} color="#FF5A75" />
            <Text style={styles.statNumber}>{stats?.favorites || 0}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>ID</Text>
            <Text style={styles.detailValue}>{profile?.id.substring(0, 8)}...</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Member since</Text>
            <Text style={styles.detailValue}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>
          {profile?.role === 'seller' && (
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>My Pets</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Help & Support</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, styles.signOutButton]} 
            onPress={signOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF5A75',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleTag: {
    backgroundColor: '#FFF0F2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  roleText: {
    fontSize: 13,
    color: '#FF5A75',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  menuContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    marginTop: 10,
    backgroundColor: '#FFF0F2',
  },
  signOutText: {
    fontSize: 16,
    color: '#FF5A75',
    fontWeight: '600',
  },
});

