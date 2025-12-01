import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  Edit,
  Heart,
  MessageCircle,
  Star,
  Crown,
  User,
  Bell,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../../../src/features/profile/context/ProfileContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { SubscriptionManager } from '../../../src/components/SubscriptionManager';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/src/theme/colors';
import { useNotifications } from '@/src/features/notifications/hooks/useNotifications';
import { CommissionTierCard } from '@/src/features/subscription/components/CommissionTierCard';

export default function ProfileScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { profile, stats, loading, refreshing, refreshProfile } = useProfile();
  const { signOut } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();
  const { stats: notificationStats } = useNotifications();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const isSeller = profile?.role === 'seller';
  const emailLower = profile?.email?.toLowerCase();
  const isAdmin = Boolean(profile?.role === 'admin' || (emailLower && emailLower.includes('admin')));
  
  // Tab bar height + marginBottom + safe area bottom + extra padding
  const tabBarHeight = Platform.OS === 'ios' ? 85 : 70;
  const tabBarMarginBottom = Platform.OS === 'ios' ? 25 : 16;
  const bottomPadding = tabBarHeight + tabBarMarginBottom + insets.bottom + 10;

  // Refresh subscription when profile screen is focused
  useEffect(() => {
    refreshSubscription();
  }, [pathname]);

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
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshProfile} />
        }
      >
        {/* Header with Gradient */}
        <View style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Cá nhân</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/me/notifications' as any)}
              >
                <Bell size={20} color="#FFFFFF" strokeWidth={2.5} />
                {notificationStats.unread > 0 && (
                  <View style={styles.iconBadge}>
                    <Text style={styles.iconBadgeText}>
                      {notificationStats.unread > 9
                        ? '9+'
                        : notificationStats.unread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/me/settings')}
              >
                <Settings size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
          {/* Common Menu */}
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/pets/my-pets' as any)}
          >
            <Text style={styles.menuText}>My Pets</Text>
          </TouchableOpacity>

          {/* Seller Section */}
          {isSeller ? (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.menuSectionLabel}>🏪 Seller Tools</Text>
              
              {/* Quick Actions */}
              <View style={styles.quickActionsContainer}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/products/create' as any)}
                >
                  <View style={styles.quickActionIcon}>
                    <Text style={styles.quickActionIconText}>+</Text>
                  </View>
                  <Text style={styles.quickActionText}>Tạo sản phẩm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/(tabs)/me/dashboard' as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                    <Text style={[styles.quickActionIconText, { color: colors.primary }]}>📊</Text>
                  </View>
                  <Text style={styles.quickActionText}>Dashboard</Text>
                </TouchableOpacity>
              </View>

              {/* Commission Tier Card */}
              <View style={styles.commissionCardContainer}>
                <CommissionTierCard
                  reputationPoints={profile?.reputation_points || 0}
                  showNextTier={true}
                />
              </View>

              {/* Seller Menu Items */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/products/manage' as any)}
              >
                <View style={styles.menuRow}>
                  <Text style={styles.menuText}>Quản lý sản phẩm</Text>
                  <Text style={styles.menuSubtext}>Xem, sửa, xóa sản phẩm</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/orders/manage' as any)}
              >
                <View style={styles.menuRow}>
                  <Text style={styles.menuText}>Quản lý đơn hàng</Text>
                  <Text style={styles.menuSubtext}>Xử lý đơn hàng của bạn</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/(tabs)/me/bank-accounts' as any)}
              >
                <View style={styles.menuRow}>
                  <Text style={styles.menuText}>Tài khoản ngân hàng</Text>
                  <Text style={styles.menuSubtext}>Nhận thanh toán</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* User Section */}
              <View style={styles.sectionDivider} />
              <Text style={styles.menuSectionLabel}>👤 User Features</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/(tabs)/me/rewards' as any)}
              >
                <View style={styles.menuRow}>
                  <Text style={styles.menuText}>Điểm thưởng</Text>
                  <Text style={styles.menuSubtext}>Tích điểm và đổi quà</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
          {/* Common Features */}
          <View style={styles.sectionDivider} />
          <Text style={styles.menuSectionLabel}>⚙️ Settings</Text>
          
          {isSeller && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowSubscriptionModal(true)}
            >
              <View style={styles.menuRow}>
                <Text style={styles.menuText}>Subscription</Text>
                <Text style={styles.menuSubtext}>Quản lý gói đăng ký</Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/me/notifications' as any)}
          >
            <View style={styles.menuRow}>
              <Text style={styles.menuText}>Thông báo</Text>
              {notificationStats.unread > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>
                    {notificationStats.unread > 9
                      ? '9+'
                      : notificationStats.unread}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/me/settings')}
          >
            <View style={styles.menuRow}>
              <Text style={styles.menuText}>Cài đặt</Text>
              <Text style={styles.menuSubtext}>Ngôn ngữ, tiền tệ, v.v.</Text>
            </View>
          </TouchableOpacity>
          {isAdmin && (
            <>
              <Text style={styles.menuSectionLabel}>Admin</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin/reels' as any)}
              >
                <Text style={styles.menuText}>Duyệt reels</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin/payouts' as any)}
              >
                <Text style={styles.menuText}>Quản lý payout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin/disputes' as any)}
              >
                <Text style={styles.menuText}>Quản lý dispute</Text>
              </TouchableOpacity>
            </>
          )}
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

      {/* Subscription Modal */}
      <Modal
        visible={showSubscriptionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  iconBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  menuSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionIconText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  menuRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  menuBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  commissionCardContainer: {
    marginHorizontal: 0,
    marginVertical: 8,
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
