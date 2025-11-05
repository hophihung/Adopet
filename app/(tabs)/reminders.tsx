import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Reminder } from '@/src/features/reminders/types';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { ReminderCard } from '@/src/features/reminders/components/ReminderCard';
import { useFocusEffect } from 'expo-router';
import { Plus, Bell, Zap, Volume2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

// ✅ Cấu hình để hiển thị notification đầy đủ cả khi app đang mở (foreground)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Log để debug
    console.log(
      '📬 Notification received:',
      notification.request.content.title
    );

    return {
      shouldShowAlert: false, // Tắt alert style (deprecated nhưng cần set false)
      shouldPlaySound: true, // ✅ Phát âm thanh
      shouldSetBadge: false, // Không set badge
      shouldShowBanner: true, // ✅ Hiển thị banner đầy đủ
      shouldShowList: true, // ✅ Hiện trong notification list
    };
  },
});

export default function RemindersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [logs, setLogs] = useState<any[]>([]);
  const [inactiveReminders, setInactiveReminders] = useState<Reminder[]>([]);

  // ✅ Function phát âm thanh báo thức bằng notification (không dùng expo-av)
  const handlePlayAlarmSound = async () => {
    try {
      // Phát âm thanh bằng cách tạo notification ngay lập tức (trigger: null)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Test âm thanh',
          body: 'Đây là âm thanh thông báo nhắc nhở',
          sound: 'default', // System notification sound
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: {
            soundTest: true,
            timestamp: Date.now(),
          },
        },
        trigger: null, // null = hiển thị ngay lập tức
      });

      console.log('✅ Playing alarm sound via notification');
    } catch (error) {
      console.error('Sound error:', error);
      Alert.alert(
        'Lỗi',
        'Không thể phát âm thanh. Hãy kiểm tra quyền thông báo.'
      );
    }
  };

  // ✅ Setup notification channel cho Android với importance MAX
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Nhắc nhở Adopet',
          importance: Notifications.AndroidImportance.MAX, // ✅ MAX để hiện banner đầy đủ
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          enableLights: true,
        });
      }

      // ✅ Đăng ký category có nút hành động
      await Notifications.setNotificationCategoryAsync('alarm_actions', [
        {
          identifier: 'DISMISS',
          buttonTitle: 'Tắt',
          options: { isDestructive: true, opensAppToForeground: false },
        },
        {
          identifier: 'SNOOZE_5S',
          buttonTitle: 'Hoãn (5s)',
          options: { opensAppToForeground: false },
        },
      ]);

      // ✅ Listen for notifications khi app đang mở
      const subscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('🔔 Notification received in foreground:', notification);
        }
      );

      // ✅ Listen action buttons (Dismiss/Snooze)
      const responseSub = Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const action = response.actionIdentifier;
          if (action === 'SNOOZE_5S') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⏰ Báo thức (Snooze)',
                body: 'Đã hoãn 5 giây',
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 250, 250, 250],
                categoryIdentifier: 'alarm_actions',
              },
              trigger: { seconds: 5, channelId: 'reminders' },
            });
          }
          // DISMISS: không cần làm gì, hệ thống tự đóng.
        }
      );

      return () => {
        subscription.remove();
        responseSub.remove();
      };
    };

    setupNotifications();
  }, []);

  const handleTestNotification = async () => {
    try {
      // ✅ Request permissions với options đầy đủ
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Không có quyền thông báo',
          'Vui lòng vào Cài đặt > Ứng dụng > Adopet > Thông báo để bật quyền.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 🔔 Hiển thị báo thức NGAY lập tức với nút Tắt và Hoãn 5s
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Báo thức',
          body: 'Nhấn Tắt hoặc Hoãn 5s',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          categoryIdentifier: 'alarm_actions',
          data: { kind: 'test_alarm' },
        },
        trigger: null,
      });

      Alert.alert('✅ Đã hiển thị', 'Báo thức hiện ngay với nút Tắt / Hoãn 5s');
    } catch (error: any) {
      console.error('❌ Test notification error:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể gửi thông báo test');
    }
  };

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
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.fab}
              onPress={handlePlayAlarmSound}
              activeOpacity={0.8}
            >
              <Volume2 color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fab}
              onPress={handleTestNotification}
              activeOpacity={0.8}
            >
              <Zap color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push('/reminder/create-reminder')}
              activeOpacity={0.8}
            >
              <Plus color="#fff" size={22} />
            </TouchableOpacity>
          </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 40,
    height: 40,
    borderRadius: 20,
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
