import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Flag } from 'lucide-react-native';
import { ReportModal } from '@/src/features/reports/components/ReportModal';
import { ReportTargetType } from '@/src/features/reports/services/report.service';
import { colors } from '@/src/theme/colors';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  size?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  containerStyle?: any;
}

export function ReportButton({
  targetType,
  targetId,
  targetName,
  size = 20,
  color = colors.textSecondary,
  showLabel = false,
  label = 'Tố cáo',
  containerStyle,
}: ReportButtonProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, containerStyle]}
        onPress={() => setShowReportModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Flag size={size} color={color} />
        </View>
        {showLabel && <View style={styles.labelContainer} />}
      </TouchableOpacity>
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: 4,
  },
});

