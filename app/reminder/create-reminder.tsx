import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReminderType,
  ReminderFrequency,
} from '@/src/features/reminders/types';
import { ReminderTypeSelector } from '@/src/features/reminders/components/ReminderTypeSelector';
import { TimePicker } from '@/src/features/reminders/components/TimePicker';
import { FrequencyPicker } from '@/src/features/reminders/components/FrequencyPicker';
import { PetSelector } from '@/src/features/reminders/components/PetSelector';
import { PetService } from '@/src/features/pets/services/pet.service';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';

export default function CreateReminderScreen() {
  const { user } = useAuth();
  const [type, setType] = useState<ReminderType>('feeding');
  const [petId, setPetId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('07:00');
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[] | undefined>(undefined);
  const [customInterval, setCustomInterval] = useState<number | undefined>(
    undefined
  );
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
    if (!title.trim())
      return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề');

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
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo nhắc nhở</Text>
          <TouchableOpacity onPress={onSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Lưu</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Loại nhắc nhở</Text>
          <ReminderTypeSelector selected={type} onSelect={setType} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Chọn thú cưng</Text>
          <PetSelector
            pets={pets}
            selectedPetId={petId}
            onSelect={setPetId as any}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tiêu đề</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Ví dụ: Cho ăn sáng"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Mô tả</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="200g thức ăn hạt + nước"
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, styles.textArea]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Thời gian</Text>
          <TimePicker value={time} onChange={setTime} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tần suất</Text>
          <FrequencyPicker
            frequency={frequency}
            daysOfWeek={daysOfWeek as any}
            customInterval={customInterval}
            onChange={(v) => {
              setFrequency(v.frequency);
              setDaysOfWeek(v.daysOfWeek);
              setCustomInterval(v.customInterval);
            }}
          />
        </View>
      </ScrollView>
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
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    height: 48,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
});
