import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { Reminder } from '@/src/features/reminders/types';
import { ReminderCard } from '@/src/features/reminders/components/ReminderCard';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/src/theme/colors';

export default function RemindersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'reminders' | 'profile'>('reminders');
  
  // Navigate between reminders and profile
  const handleTabChange = (tab: 'reminders' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'profile') {
      router.replace('/(tabs)/me/profile');
    } else {
      router.replace('/(tabs)/me/reminders');
    }
  };

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname?.includes('/profile')) {
      setActiveTab('profile');
    } else {
      setActiveTab('reminders');
    }
  }, [pathname]);

  useEffect(() => {
    if (user?.id) {
      loadReminders();
    }
  }, [user?.id]);

  const loadReminders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await ReminderService.getUserReminders(user.id);
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleToggle = async (reminderId: string, isActive: boolean) => {
    try {
      await ReminderService.toggleReminder(reminderId, isActive);
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, is_active: !isActive } : r))
      );
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const handleEdit = (reminderId: string) => {
    router.push(`/reminder/edit-reminder?id=${reminderId}` as any);
  };

  const handleDelete = async (reminderId: string) => {
    try {
      await ReminderService.deleteReminder(reminderId);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải nhắc nhở...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTabsContainer}>
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('reminders')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'reminders' && styles.headerTabTextActive]}>
                Nhắc nhở
              </Text>
              {activeTab === 'reminders' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
            <View style={styles.headerTabDivider} />
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('profile')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'profile' && styles.headerTabTextActive]}>
                Cá nhân
              </Text>
              {activeTab === 'profile' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/reminder/create-reminder')}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#FF6B6B" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Reminders List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Chưa có nhắc nhở nào</Text>
            <Text style={styles.emptySubtitle}>
              Tạo nhắc nhở để chăm sóc pet của bạn đúng giờ!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/reminder/create-reminder')}
            >
              <Text style={styles.emptyButtonText}>Tạo nhắc nhở đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onToggle={(value) => handleToggle(reminder.id, reminder.is_active)}
              onEdit={() => handleEdit(reminder.id)}
              onDelete={() => handleDelete(reminder.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  headerTab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  headerTabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTabText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerTabTextActive: {
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  headerTabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{ translateX: -20 }],
    width: 40,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

