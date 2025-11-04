import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Reminder } from '@/src/features/reminders/types';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { ReminderCard } from '@/src/features/reminders/components/ReminderCard';
import { useFocusEffect } from 'expo-router';
import { Plus, Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function RemindersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [logs, setLogs] = useState<any[]>([]);
  const [inactiveReminders, setInactiveReminders] = useState<Reminder[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await ReminderService.getUserReminders(user.id, {
        activeOnly: tab === 'active',
      });
      setReminders(data);
      if (tab === 'history') {
        // Inactive reminders (đã tắt)
        setInactiveReminders(data.filter((r) => !r.is_active));
        // Gather logs từ tất cả reminders (đã từng hành động)
        const all = await Promise.all(
          data.map((r) => ReminderService.getLogs(r.id).catch(() => []))
        );
        const merged = all
          .flat()
          .sort(
            (a: any, b: any) =>
              new Date(b.reminded_at).getTime() -
              new Date(a.reminded_at).getTime()
          );
        setLogs(merged);
      } else {
        setInactiveReminders([]);
        setLogs([]);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được nhắc nhở');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.id, tab])
  );

  const onToggle = async (id: string, value: boolean) => {
    try {
      await ReminderService.toggleReminder(id, value);
      await load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không đổi trạng thái được');
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert('Xóa nhắc nhở', 'Bạn có chắc muốn xóa?', [
      { text: 'Hủy' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await ReminderService.deleteReminder(id);
            await load();
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không xóa được');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Bell size={28} color="#fff" />
            <Text style={styles.header}>Nhắc nhở</Text>
          </View>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/reminder/create-reminder')}
            activeOpacity={0.8}
          >
            <Plus color="#fff" size={22} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['active', 'history'] as const).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t === 'active' ? 'Đang hoạt động' : 'Lịch sử'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF6B6B" />
        </View>
      ) : tab === 'active' ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              onToggle={(v) => onToggle(item.id, v)}
              onEdit={() =>
                router.push(`/reminder/edit-reminder?id=${item.id}` as any)
              }
              onDelete={() => onDelete(item.id)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có nhắc nhở nào</Text>
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={
            [
              { __section: 'logs' },
              ...logs,
              { __section: 'inactive' },
              ...inactiveReminders,
            ] as any[]
          }
          keyExtractor={(item, idx) => item.id ?? item.__section ?? String(idx)}
          renderItem={({ item }) => {
            if (item.__section === 'logs') {
              return logs.length ? (
                <Text style={styles.sectionTitle}>Nhật ký</Text>
              ) : null;
            }
            if (item.__section === 'inactive') {
              return inactiveReminders.length ? (
                <Text style={[styles.sectionTitle, styles.sectionTitleSpace]}>
                  Đã tắt
                </Text>
              ) : null;
            }
            if (item.reminder_id) {
              // log row
              return (
                <View style={styles.logCard}>
                  <Text style={styles.logStatus}>
                    {item.status === 'completed'
                      ? '✅ Hoàn thành'
                      : item.status === 'snoozed'
                      ? '⏰ Báo lại'
                      : '❌ Bỏ qua'}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(item.reminded_at).toLocaleString()}
                  </Text>
                  {item.notes ? (
                    <Text style={styles.logNotes}>{item.notes}</Text>
                  ) : null}
                </View>
              );
            }
            // inactive reminder row
            return (
              <View style={styles.inactiveCard}>
                <Text style={styles.inactiveTitle}>{item.title}</Text>
                <Text style={styles.inactiveStatus}>Đã tắt</Text>
                <TouchableOpacity
                  onPress={() => onToggle(item.id, true)}
                  style={styles.reactivateButton}
                >
                  <Text style={styles.reactivateText}>Bật lại</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có lịch sử</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
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
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  tabActive: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 60,
    fontSize: 15,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  sectionTitleSpace: {
    marginTop: 16,
  },
  logCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  logStatus: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
  },
  logTime: {
    color: '#999',
    marginTop: 6,
    fontSize: 13,
  },
  logNotes: {
    marginTop: 6,
    color: '#666',
    fontSize: 14,
  },
  inactiveCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#333',
  },
  inactiveStatus: {
    color: '#999',
    marginTop: 4,
    fontSize: 13,
  },
  reactivateButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  reactivateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
