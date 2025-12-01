import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { ReportService, ReportType, ReportTargetType } from '../services/report.service';
import { colors } from '@/src/theme/colors';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'harassment', label: 'Quấy rối' },
  { value: 'fake', label: 'Gian lận/Giả mạo' },
  { value: 'other', label: 'Khác' },
];

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại báo cáo');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do báo cáo');
      return;
    }

    try {
      setSubmitting(true);
      const report = await ReportService.createReport({
        target_type: targetType,
        target_id: targetId,
        report_type: selectedType,
        reason: reason.trim(),
      });

      if (report) {
        Alert.alert('Thành công', 'Báo cáo của bạn đã được gửi. Chúng tôi sẽ xem xét trong thời gian sớm nhất.', [
          { text: 'OK', onPress: onClose },
        ]);
        setSelectedType(null);
        setReason('');
      } else {
        Alert.alert('Lỗi', 'Không thể gửi báo cáo. Vui lòng thử lại.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi gửi báo cáo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AlertTriangle size={24} color={colors.error} />
              <Text style={styles.headerTitle}>Báo cáo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {targetName && (
            <Text style={styles.targetName}>Báo cáo: {targetName}</Text>
          )}

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Loại báo cáo</Text>
            <View style={styles.typeContainer}>
              {REPORT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    selectedType === type.value && styles.typeButtonActive,
                  ]}
                  onPress={() => setSelectedType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === type.value && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Lý do chi tiết</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Mô tả chi tiết vấn đề..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  targetName: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

