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
import { useLocalSearchParams, router } from 'expo-router';
import {
  Reminder,
  ReminderType,
  ReminderFrequency,
} from '@/src/features/reminders/types';
import { ReminderTypeSelector } from '@/src/features/reminders/components/ReminderTypeSelector';
import { TimePicker } from '@/src/features/reminders/components/TimePicker';
import { FrequencyPicker } from '@/src/features/reminders/components/FrequencyPicker';
import { ReminderService } from '@/src/features/reminders/services/reminder.service';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';

export default function EditReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [reminder, setReminder] = useState<Reminder | null>(null);

  const [type, setType] = useState<ReminderType>('feeding');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('07:00');
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[] | undefined>(undefined);
  const [customInterval, setCustomInterval] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const r = await ReminderService.getReminderById(id as string);
        setReminder(r);
        setType(r.type);
        setTitle(r.title);
        setDescription(r.description || '');
        setTime((r.time || '').slice(0, 5));
        setFrequency(r.frequency);
        setDaysOfWeek((r.days_of_week || undefined) as any);
        setCustomInterval((r.custom_interval || undefined) as any);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được nhắc nhở');
      }
    })();
  }, [id]);

  const onSave = async () => {
    if (!id) return;
    if (!title.trim())
      return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề');

    try {
      await ReminderService.updateReminder(id as string, {
        type,
        title,
        description,
        frequency,
        time,
        days_of_week: daysOfWeek as any,
        custom_interval: customInterval,
      });
      Alert.alert('Thành công', 'Đã cập nhật nhắc nhở');
      router.back();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không cập nhật được');
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
          <Text style={styles.headerTitle}>Sửa nhắc nhở</Text>
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
          <Text style={styles.label}>Tiêu đề</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Tiêu đề"
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
              placeholder="Mô tả"
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
