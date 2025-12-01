import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { MoreVertical, Flag, X } from 'lucide-react-native';
import { ReportModal } from '@/src/features/reports/components/ReportModal';
import { ReportTargetType } from '@/src/features/reports/services/report.service';
import { colors } from '@/src/theme/colors';

interface MoreOptionsMenuProps {
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  showReport?: boolean;
}

export function MoreOptionsMenu({
  targetType,
  targetId,
  targetName,
  onEdit,
  onDelete,
  showEdit = false,
  showDelete = false,
  showReport = true,
}: MoreOptionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
        activeOpacity={0.7}
      >
        <MoreVertical size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Tùy chọn</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMenu(false)}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuItems}>
              {showEdit && onEdit && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                >
                  <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              )}

              {showDelete && onDelete && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                >
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              )}

              {showReport && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                >
                  <Flag size={18} color={colors.error} />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                    Tố cáo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
  menuButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '50%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemDanger: {
    borderBottomColor: colors.borderLight,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  menuItemTextDanger: {
    color: colors.error,
    fontWeight: '600',
  },
});

