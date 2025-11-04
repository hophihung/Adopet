import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function PetSelector({
  pets,
  selectedPetId,
  onSelect,
}: {
  pets: { id: string; name: string; type?: string }[];
  selectedPetId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {pets.map((p) => {
        const active = selectedPetId === p.id;
        return (
          <TouchableOpacity key={p.id} onPress={() => onSelect(p.id)}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: active ? '#FF5A75' : '#eee', backgroundColor: active ? '#FFF1F3' : '#fff' }}>
            <Text style={{ color: active ? '#FF5A75' : '#333', fontWeight: active ? '700' : '500' }}>{p.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
