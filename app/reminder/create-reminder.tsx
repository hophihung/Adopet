import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ReminderType, ReminderFrequency } from '@/src/features/reminders/types';
import { ReminderTypeSelector } from '@/src/features/reminders/components/ReminderTypeSelector';
import { TimePicker } from '@/src/features/reminders/components/TimePicker';
import { FrequencyPicker } from '@/src/features/reminders/components/FrequencyPicker';
import { PetSelector } from '@/src/features/reminders/components/PetSelector';
import { PetService } from '@/src/features/pets/services/pet.service';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { router } from 'expo-router';

export default function CreateReminderScreen() {
  const { user } = useAuth();
  const [type, setType] = useState<ReminderType>('feeding');
  const [petId, setPetId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('07:00');
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[] | undefined>(undefined);
  const [customInterval, setCustomInterval] = useState<number | undefined>(undefined);
  const [pets, setPets] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const list = await PetService.getUserPets(user.id);
        setPets(list.map((p: any) => ({ id: p.id, name: p.name })));
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được thú cưng');
      }
    })();
  }, [user?.id]);

  const onSave = async () => {
    if (!user) return;
    if (!petId) return Alert.alert('Thiếu thông tin', 'Vui lòng chọn thú cưng');
    if (!title.trim()) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề');

    try {
      await ReminderService.createReminder(user.id, {
        pet_id: petId,
        type,
        title,
        description,
        frequency,
        time,
        days_of_week: daysOfWeek as any,
        custom_interval: customInterval,
      });
      Alert.alert('Thành công', 'Đã tạo nhắc nhở');
      router.back();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tạo được nhắc nhở');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()}><Text>Hủy</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Tạo nhắc nhở</Text>
        <TouchableOpacity onPress={onSave} style={{ backgroundColor: '#FF5A75', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text style={{ marginBottom: 8, fontWeight: '700' }}>Loại nhắc nhở</Text>
          <ReminderTypeSelector selected={type} onSelect={setType} />
        </View>

        <View>
          <Text style={{ marginBottom: 8, fontWeight: '700' }}>Chọn thú cưng</Text>
          <PetSelector pets={pets} selectedPetId={petId} onSelect={setPetId as any} />
        </View>

        <View>
          <Text style={{ marginBottom: 8, fontWeight: '700' }}>Tiêu đề</Text>
          <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 12 }}>
            <TextInput placeholder="Ví dụ: Cho ăn sáng" value={title} onChangeText={setTitle} style={{ height: 40 }} />
          </View>
        </View>

        <View>
          <Text style={{ marginBottom: 8, fontWeight: '700' }}>Mô tả</Text>
          <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 12 }}>
            <TextInput placeholder="200g thức ăn hạt + nước" value={description} onChangeText={setDescription} multiline style={{ minHeight: 80, paddingTop: 8 }} />
          </View>
        </View>

        <View>
          <Text style={{ marginBottom: 8, fontWeight: '700' }}>Thời gian</Text>
          <TimePicker value={time} onChange={setTime} />
        </View>

        <View>
          <Text style={{ marginBottom: 8, fontWeight: '700' }}>Tần suất</Text>
          <FrequencyPicker
            frequency={frequency}
            daysOfWeek={daysOfWeek as any}
            customInterval={customInterval}
            onChange={(v) => { setFrequency(v.frequency); setDaysOfWeek(v.daysOfWeek); setCustomInterval(v.customInterval); }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
