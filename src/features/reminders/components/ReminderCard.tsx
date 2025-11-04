import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { Bell, Pencil, Trash2 } from 'lucide-react-native';
import type { Reminder } from '../types';

export function ReminderCard({
  reminder,
  onToggle,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginVertical: 6, borderWidth: 1, borderColor: '#eee' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bell color="#FF5A75" size={20} />
          <Text style={{ fontWeight: '700', fontSize: 16 }}>{reminder.title}</Text>
        </View>
        <Switch value={reminder.is_active} onValueChange={onToggle} />
      </View>

      <Text style={{ color: '#666', marginTop: 6 }} numberOfLines={2}>
        {reminder.description || '—'}
      </Text>

      <Text style={{ color: '#333', marginTop: 4 }}>
        {formatMeta(reminder)}
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
        <TouchableOpacity onPress={onEdit} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f7f7f7' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pencil size={16} color="#333" />
            <Text>Sửa</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fff0f2', borderWidth: 1, borderColor: '#ffd1d8' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Trash2 size={16} color="#FF5A75" />
            <Text style={{ color: '#FF5A75' }}>Xóa</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatMeta(reminder: Reminder) {
  const hhmm = (reminder.time || '').slice(0,5);
  const freqMap: Record<string, string> = {
    daily: 'Hằng ngày',
    weekly: 'Hằng tuần',
    monthly: 'Hàng tháng',
    custom: `Mỗi ${reminder.custom_interval ?? '?'} ngày`,
  };
  const dowMap = ['CN','T2','T3','T4','T5','T6','T7'];
  const weekly = reminder.frequency === 'weekly' && reminder.days_of_week?.length
    ? ` (${reminder.days_of_week.map(d => dowMap[d]).join(', ')})`
    : '';
  return `${hhmm} • ${freqMap[reminder.frequency]}${weekly}`;
}
