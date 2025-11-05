import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import {
  Settings,
  Edit,
  Heart,
  MessageCircle,
  Star,
  Crown,
  User,
  LogOut,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../../src/features/profile/context/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionManager } from '../../src/components/SubscriptionManager';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { profile, stats, loading, refreshing, refreshProfile } = useProfile();
  const { signOut } = useAuth();
  const { subscription } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ✅ Function xử lý sign out với confirmation
  const handleSignOut = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await signOut();
            // Navigate to login screen
            router.replace('/(auth)/login');
          } catch (error: any) {
            console.error('Sign out error:', error);
            Alert.alert(
              'Lỗi',
              error?.message || 'Không thể đăng xuất. Vui lòng thử lại.'
            );
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5A75" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshProfile} />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <User size={28} color="#fff" />
              <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: profile?.avatar_url || 'https://via.placeholder.com/120',
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
          <Text style={styles.bio}>{profile?.email || 'No email'}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>
              {profile?.role === 'seller' ? '🏪 Seller' : '👤 User'}
            </Text>
          </View>

          {/* Subscription Status */}
          <TouchableOpacity
            style={styles.subscriptionCard}
            onPress={() => setShowSubscriptionModal(true)}
          >
            <View style={styles.subscriptionContent}>
              <Crown size={20} color="#FF9500" />
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  Gói {subscription?.plan?.toUpperCase() || 'FREE'}
                </Text>
                <Text style={styles.subscriptionSubtitle}>
                  {subscription?.status === 'active'
                    ? 'Đang hoạt động'
                    : 'Chưa đăng ký'}
                </Text>
              </View>
              <Text style={styles.subscriptionArrow}>›</Text>
            </View>
          </TouchableOpacity>
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
            <Text style={styles.detailValue}>
              {profile?.id.substring(0, 8)}...
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Member since</Text>
            <Text style={styles.detailValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : 'N/A'}
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
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowSubscriptionModal(true)}
          >
            <Text style={styles.menuText}>Subscription</Text>
          </TouchableOpacity>
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
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <View style={styles.signOutContent}>
              {signingOut ? (
                <ActivityIndicator size="small" color="#FF5A75" />
              ) : (
                <>
                  <LogOut size={18} color="#FF5A75" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Subscription Modal */}
      <Modal
        visible={showSubscriptionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Subscription</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSubscriptionModal(false)}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <SubscriptionManager
            onClose={() => setShowSubscriptionModal(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
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
    backgroundColor: '#FF6B6B',
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
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    color: '#FF5A75',
    fontWeight: '600',
  },
  subscriptionCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: '#8B5A00',
    marginTop: 2,
  },
  subscriptionArrow: {
    fontSize: 20,
    color: '#FF9500',
    fontWeight: '300',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
