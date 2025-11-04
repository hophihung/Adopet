import React from 'react';
import { View, TextInput } from 'react-native';

export function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
      <TextInput
        placeholder="HH:MM"
        value={value}
        onChangeText={onChange}
        inputMode="numeric"
        style={{ fontSize: 16 }}
      />
    </View>
  );
}
