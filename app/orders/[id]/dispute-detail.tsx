import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { DisputeService, EscrowDispute, DisputeMessage } from '@/src/features/disputes/services/dispute.service';
import { colors } from '@/src/theme/colors';

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [dispute, setDispute] = useState<EscrowDispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id && user?.id) {
      loadDispute();
    }
  }, [id, user?.id]);

  const loadDispute = async () => {
    if (!id || !user?.id) return;

    try {
      setLoading(true);
      const [disputeData, messagesData] = await Promise.all([
        DisputeService.getById(id, user.id),
        DisputeService.getMessages(id),
      ]);

      if (disputeData) {
        setDispute(disputeData);
        setMessages(messagesData);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy tranh chấp', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Error loading dispute:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tranh chấp');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: EscrowDispute['status']) => {
    switch (status) {
      case 'open': return '#FF9500';
      case 'under_review': return '#007AFF';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#999';
      case 'cancelled': return '#FF3B30';
      default: return '#999';
    }
  };

  const getStatusText = (status: EscrowDispute['status']) => {
    switch (status) {
      case 'open': return 'Mở';
      case 'under_review': return 'Đang xem xét';
      case 'resolved': return 'Đã xử lý';
      case 'closed': return 'Đã đóng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusIcon = (status: EscrowDispute['status']) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={24} color="#4CAF50" />;
      case 'cancelled': return <XCircle size={24} color="#FF3B30" />;
      case 'open':
      case 'under_review': return <Clock size={24} color={getStatusColor(status)} />;
      default: return <AlertCircle size={24} color={getStatusColor(status)} />;
    }
  };

  const getDisputeTypeText = (type: EscrowDispute['dispute_type']) => {
    switch (type) {
      case 'product_not_received': return 'Không nhận được sản phẩm';
      case 'product_damaged': return 'Sản phẩm bị hỏng';
      case 'product_not_as_described': return 'Sản phẩm không đúng mô tả';
      case 'seller_not_responding': return 'Người bán không phản hồi';
      case 'other': return 'Khác';
      default: return type;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dispute) {
    return null;
  }

  const isBuyer = dispute.buyer_id === user?.id;
  const isSeller = dispute.seller_id === user?.id;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết tranh chấp</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDispute();
            }}
          />
        }
      >
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            {getStatusIcon(dispute.status)}
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Trạng thái</Text>
              <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>
                {getStatusText(dispute.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Dispute Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin tranh chấp</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại tranh chấp:</Text>
            <Text style={styles.infoValue}>{getDisputeTypeText(dispute.dispute_type)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lý do:</Text>
            <Text style={styles.infoValue}>{dispute.reason}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mô tả:</Text>
            <Text style={styles.infoValue}>{dispute.description}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày mở:</Text>
            <Text style={styles.infoValue}>
              {new Date(dispute.opened_at).toLocaleString('vi-VN')}
            </Text>
          </View>
        </View>

        {/* Resolution (if resolved) */}
        {dispute.status === 'resolved' && dispute.resolution && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quyết định xử lý</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quyết định:</Text>
              <Text style={styles.infoValue}>{dispute.resolution}</Text>
            </View>
            {dispute.resolution_type && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Loại xử lý:</Text>
                <Text style={styles.infoValue}>
                  {dispute.resolution_type === 'refund_buyer' ? 'Hoàn tiền cho người mua' :
                   dispute.resolution_type === 'release_to_seller' ? 'Giải phóng tiền cho người bán' :
                   dispute.resolution_type === 'partial_refund' ? `Hoàn tiền một phần: ${dispute.resolution_amount?.toLocaleString('vi-VN')} VND` :
                   'Không có hành động'}
                </Text>
              </View>
            )}
            {dispute.resolved_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày xử lý:</Text>
                <Text style={styles.infoValue}>
                  {new Date(dispute.resolved_at).toLocaleString('vi-VN')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <View style={styles.card}>
            <View style={styles.messagesHeader}>
              <MessageSquare size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Tin nhắn ({messages.length})</Text>
            </View>
            {messages.map((message) => (
              <View key={message.id} style={styles.messageItem}>
                <Text style={styles.messageText}>{message.message}</Text>
                <Text style={styles.messageDate}>
                  {new Date(message.created_at).toLocaleString('vi-VN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Evidence (if any) */}
        {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bằng chứng</Text>
            <Text style={styles.infoValue}>
              {dispute.evidence_urls.length} file đính kèm
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  messageItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
});

