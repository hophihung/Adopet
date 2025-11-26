import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, X, Flag, User } from 'lucide-react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ReelModerationService, PendingReel } from '@/src/features/reels';
import { colors } from '@/src/theme/colors';

export default function AdminReelsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [reels, setReels] = useState<PendingReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedReel, setSelectedReel] = useState<PendingReel | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = Boolean(profile?.role === 'admin' || profile?.email?.toLowerCase().includes('admin'));

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Lỗi', 'Chỉ admin mới có thể truy cập trang này', [
        { text: 'Đóng', onPress: () => router.back() },
      ]);
      return;
    }
    loadReels();
  }, [isAdmin]);

  const loadReels = async () => {
    try {
      setLoading(true);
      const data = await ReelModerationService.getPending();
      setReels(data);
    } catch (error: any) {
      console.error('Error loading reels:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách reels chờ duyệt');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (reel: PendingReel) => {
    Alert.alert(
      'Duyệt reel',
      'Bạn có chắc chắn muốn duyệt reel này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              setProcessing(true);
              await ReelModerationService.approve(reel.id);
              Alert.alert('Thành công', 'Đã duyệt reel');
              await loadReels();
            } catch (error: any) {
              console.error('Approve reel error:', error);
              Alert.alert('Lỗi', error.message || 'Không thể duyệt reel');
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleReject = (reel: PendingReel) => {
    setSelectedReel(reel);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedReel) return;
    try {
      setProcessing(true);
      await ReelModerationService.reject(selectedReel.id, rejectReason.trim() || undefined);
      Alert.alert('Thành công', 'Đã từ chối reel');
      setShowRejectModal(false);
      setSelectedReel(null);
      setRejectReason('');
      await loadReels();
    } catch (error: any) {
      console.error('Reject reel error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể từ chối reel');
    } finally {
      setProcessing(false);
    }
  };

  const renderMedia = (item: PendingReel) => {
    if (item.media_type === 'image') {
      return (
        <Image
          source={{ uri: item.image_url || item.thumbnail_url || '' }}
          style={styles.media}
          resizeMode="cover"
        />
      );
    }

    return (
      <Video
        source={{ uri: item.video_url || '' }}
        style={styles.media}
        resizeMode="cover"
        useNativeControls
        shouldPlay={false}
      />
    );
  };

  const renderReel = ({ item }: { item: PendingReel }) => {
    const owner = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;

    return (
      <View style={styles.card}>
        {renderMedia(item)}
        <View style={styles.infoContainer}>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              {owner?.avatar_url ? (
                <Image source={{ uri: owner.avatar_url }} style={styles.ownerAvatarImage} />
              ) : (
                <User size={20} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{owner?.full_name || 'User'}</Text>
              <Text style={styles.ownerEmail}>{owner?.email || '—'}</Text>
            </View>
            <Text style={styles.createdAt}>
              {new Date(item.created_at).toLocaleString('vi-VN')}
            </Text>
          </View>

          {item.caption && (
            <Text style={styles.caption} numberOfLines={3}>
              {item.caption}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Media</Text>
              <Text style={styles.metaValue}>{item.media_type === 'video' ? 'Video' : 'Ảnh'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Moderation</Text>
              <Text style={styles.metaValue}>
                {item.is_sensitive ? 'Nhạy cảm' : item.is_pet_related ? 'Đúng chủ đề' : 'Không liên quan pet'}
              </Text>
            </View>
          </View>

          {item.moderation_reason && (
            <View style={styles.reasonBox}>
              <Flag size={16} color={colors.warning} />
              <Text style={styles.reasonText}>{item.moderation_reason}</Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
              disabled={processing}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.actionText}>Duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
              disabled={processing}
            >
              <X size={18} color="#fff" />
              <Text style={styles.actionText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Duyệt Reel</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {reels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Không có reel chờ duyệt</Text>
          <Text style={styles.emptySubtitle}>Những reel mới sẽ xuất hiện tại đây</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={renderReel}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadReels();
              }}
            />
          }
        />
      )}

      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nhập lý do từ chối</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: Nội dung không liên quan đến thú cưng"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedReel(null);
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, processing && styles.modalButtonDisabled]}
                onPress={confirmReject}
                disabled={processing}
              >
                {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Từ chối</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: 360,
    backgroundColor: '#000',
  },
  infoContainer: {
    padding: 16,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ownerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ownerEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  createdAt: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  caption: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metaBadge: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  approveButton: {
    backgroundColor: '#22C55E',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  modalInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalConfirmButton: {
    backgroundColor: colors.error,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

