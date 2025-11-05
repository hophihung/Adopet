import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { Reminder } from '@/src/features/reminders/types';
import { ReminderCard } from '@/src/features/reminders/components/ReminderCard';
import { router } from 'expo-router';
import { colors } from '@/src/theme/colors';

export default function RemindersScreen() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>Nhắc nhở</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/reminder/create-reminder')}
          activeOpacity={0.8}
        >
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
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

