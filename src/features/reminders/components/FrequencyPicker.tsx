import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { DayOfWeek, ReminderFrequency } from '../types';

export function FrequencyPicker({
  frequency,
  daysOfWeek,
  customInterval,
  onChange,
}: {
  frequency: ReminderFrequency;
  daysOfWeek?: DayOfWeek[];
  customInterval?: number;
  onChange: (v: { frequency: ReminderFrequency; daysOfWeek?: DayOfWeek[]; customInterval?: number }) => void;
}) {
  const isWeekly = frequency === 'weekly';
  const isCustom = frequency === 'custom';

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['daily','weekly','monthly','custom'] as ReminderFrequency[]).map(f => {
          const active = f === frequency;
          return (
            <TouchableOpacity key={f} onPress={() => onChange({ frequency: f, daysOfWeek, customInterval })}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: active ? '#FF5A75' : '#eee', backgroundColor: active ? '#FFF1F3' : '#fff' }}>
              <Text style={{ color: active ? '#FF5A75' : '#333', fontWeight: active ? '700' : '500' }}>
                {f === 'daily' ? 'Hằng ngày' : f === 'weekly' ? 'Hằng tuần' : f === 'monthly' ? 'Hàng tháng' : 'Tùy chỉnh'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isWeekly && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {[1,2,3,4,5,6,0].map(d => {
            const active = (daysOfWeek || []).includes(d as DayOfWeek);
            const label = ['CN','T2','T3','T4','T5','T6','T7'][d];
            return (
              <TouchableOpacity key={d} onPress={() => {
                const set = new Set(daysOfWeek || []);
                if (active) set.delete(d as DayOfWeek); else set.add(d as DayOfWeek);
                onChange({ frequency, daysOfWeek: Array.from(set) as DayOfWeek[], customInterval });
              }}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: active ? '#FF5A75' : '#eee', backgroundColor: active ? '#FFF1F3' : '#fff' }}>
                <Text style={{ color: active ? '#FF5A75' : '#333' }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isCustom && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text>Mỗi</Text>
          <TouchableOpacity onPress={() => {
            const next = Math.max(1, (customInterval || 1) - 1);
            onChange({ frequency, daysOfWeek, customInterval: next });
          }} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text>-</Text>
          </TouchableOpacity>
          <View style={{ minWidth: 40, alignItems: 'center' }}>
            <Text>{customInterval || 1}</Text>
          </View>
          <TouchableOpacity onPress={() => {
            const next = Math.min(365, (customInterval || 1) + 1);
            onChange({ frequency, daysOfWeek, customInterval: next });
          }} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text>+</Text>
          </TouchableOpacity>
          <Text>ngày</Text>
        </View>
      )}
    </View>
  );
}
