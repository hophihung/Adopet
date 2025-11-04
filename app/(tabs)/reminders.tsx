import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Reminder } from '@/src/features/reminders/types';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { ReminderCard } from '@/src/features/reminders/components/ReminderCard';
import { useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';

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
      const data = await ReminderService.getUserReminders(user.id, { activeOnly: tab === 'active' });
      setReminders(data);
      if (tab === 'history') {
        // Inactive reminders (đã tắt)
        setInactiveReminders(data.filter(r => !r.is_active));
        // Gather logs từ tất cả reminders (đã từng hành động)
        const all = await Promise.all(
          data.map((r) => ReminderService.getLogs(r.id).catch(() => []))
        );
        const merged = all.flat().sort((a: any, b: any) => (new Date(b.reminded_at).getTime() - new Date(a.reminded_at).getTime()));
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

  useFocusEffect(useCallback(() => { load(); }, [user?.id, tab]));

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
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await ReminderService.deleteReminder(id); await load(); } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Không xóa được'); }
      }}
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>Nhắc nhở</Text>
        <TouchableOpacity onPress={() => router.push('/reminder/create-reminder')} style={{ backgroundColor: '#FF5A75', padding: 8, borderRadius: 10 }}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
        {(['active','history'] as const).map(t => {
          const active = tab === t;
          return (
            <TouchableOpacity key={t} onPress={() => setTab(t)}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: active ? '#FF5A75' : '#f5f5f5' }}>
              <Text style={{ color: active ? '#fff' : '#333', fontWeight: '700' }}>{t === 'active' ? 'Đang hoạt động' : 'Lịch sử'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : tab === 'active' ? (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              onToggle={(v) => onToggle(item.id, v)}
              onEdit={() => router.push(`/reminder/edit-reminder?id=${item.id}` as any)}
              onDelete={() => onDelete(item.id)}
            />
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>Chưa có nhắc nhở nào</Text>}
        />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={[{__section:'logs'}, ...logs, {__section:'inactive'}, ...inactiveReminders] as any[]}
          keyExtractor={(item, idx) => item.id ?? item.__section ?? String(idx)}
          renderItem={({ item }) => {
            if (item.__section === 'logs') {
              return logs.length ? <Text style={{ fontWeight: '800', marginBottom: 8 }}>Nhật ký</Text> : null;
            }
            if (item.__section === 'inactive') {
              return inactiveReminders.length ? <Text style={{ fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Đã tắt</Text> : null;
            }
            if (item.reminder_id) {
              // log row
              return (
                <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginVertical: 6 }}>
                  <Text style={{ fontWeight: '700' }}>{item.status === 'completed' ? '✅ Hoàn thành' : item.status === 'snoozed' ? '⏰ Báo lại' : '❌ Bỏ qua'}</Text>
                  <Text style={{ color: '#666', marginTop: 4 }}>{new Date(item.reminded_at).toLocaleString()}</Text>
                  {item.notes ? <Text style={{ marginTop: 4 }}>{item.notes}</Text> : null}
                </View>
              );
            }
            // inactive reminder row
            return (
              <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginVertical: 6, backgroundColor: '#fff8f9' }}>
                <Text style={{ fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#666', marginTop: 4 }}>Đã tắt</Text>
                <TouchableOpacity onPress={() => onToggle(item.id, true)} style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#FF5A75', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Bật lại</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>Chưa có lịch sử</Text>}
        />
      )}
    </View>
  );
}
