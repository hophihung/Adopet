import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bone, Pill, ShowerHead, Syringe, Stethoscope, Dumbbell } from 'lucide-react-native';
import type { ReminderType } from '../types';

const TYPES: { key: ReminderType; label: string; Icon: any }[] = [
  { key: 'feeding', label: 'Cho ăn', Icon: Bone },
  { key: 'medicine', label: 'Thuốc', Icon: Pill },
  { key: 'bathing', label: 'Tắm', Icon: ShowerHead },
  { key: 'vaccination', label: 'Tiêm', Icon: Syringe },
  { key: 'health_check', label: 'Khám', Icon: Stethoscope },
  { key: 'exercise', label: 'Vận động', Icon: Dumbbell },
];

export function ReminderTypeSelector({ selected, onSelect }: { selected: ReminderType; onSelect: (t: ReminderType) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {TYPES.map(({ key, label, Icon }) => {
        const active = selected === key;
        return (
          <TouchableOpacity key={key} onPress={() => onSelect(key)}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: active ? '#FF5A75' : '#eee', backgroundColor: active ? '#FFF1F3' : '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon size={16} color={active ? '#FF5A75' : '#666'} />
            <Text style={{ color: active ? '#FF5A75' : '#333', fontWeight: active ? '700' : '500' }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
