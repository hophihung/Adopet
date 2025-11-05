import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Gift, Sparkles, Star, Heart, Coins } from 'lucide-react-native';
import { petColors, PetType } from '../../../config/virtualPet/animations';

interface CheckinReward {
  day: number;
  type: 'exp' | 'mood' | 'coin' | 'special';
  amount: number;
  label: string;
  icon: string;
}

const CHECKIN_REWARDS: CheckinReward[] = [
  { day: 1, type: 'exp', amount: 50, label: '50 EXP', icon: '⭐' },
  { day: 2, type: 'mood', amount: 10, label: '10 Mood', icon: '💚' },
  { day: 3, type: 'exp', amount: 75, label: '75 EXP', icon: '⭐' },
  { day: 4, type: 'coin', amount: 100, label: '100 Coins', icon: '💰' },
  { day: 5, type: 'exp', amount: 100, label: '100 EXP', icon: '⭐' },
  { day: 6, type: 'mood', amount: 20, label: '20 Mood', icon: '💚' },
  { day: 7, type: 'special', amount: 200, label: '200 EXP + 50 Coins', icon: '🎁' },
];

interface CheckinCalendarProps {
  visible: boolean;
  onClose: () => void;
  streakDays: number;
  hasCheckedInToday: boolean;
  petType?: PetType;
}

export function CheckinCalendar({
  visible,
  onClose,
  streakDays,
  hasCheckedInToday,
  petType = 'cat',
}: CheckinCalendarProps) {
  const colors = petColors[petType];
  const currentDay = Math.min(streakDays + (hasCheckedInToday ? 1 : 0), 7);

  const getDayStatus = (day: number) => {
    if (day < currentDay) return 'claimed'; // Đã nhận
    if (day === currentDay && !hasCheckedInToday) return 'available'; // Có thể nhận hôm nay
    if (day === currentDay && hasCheckedInToday) return 'claimed'; // Đã nhận hôm nay
    return 'locked'; // Chưa mở khóa
  };

  const getRewardIcon = (reward: CheckinReward) => {
    switch (reward.type) {
      case 'exp':
        return <Star size={20} color="#FFB347" />;
      case 'mood':
        return <Heart size={20} color="#FF3B30" />;
      case 'coin':
        return <Coins size={20} color="#FFD700" />;
      case 'special':
        return <Gift size={20} color="#FF6B9D" />;
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={24} color={colors.primary} />
              <Text style={styles.headerTitle}>Điểm danh 7 ngày</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Streak Info */}
          <View style={styles.streakInfo}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.streakBadge}
            >
              <Text style={styles.streakText}>{currentDay} / 7 ngày</Text>
            </LinearGradient>
            <Text style={styles.streakSubtext}>
              {currentDay === 7
                ? '🎉 Hoàn thành chuỗi 7 ngày!'
                : `Còn ${7 - currentDay} ngày để nhận phần thưởng cuối!`}
            </Text>
          </View>

          {/* Calendar Days */}
          <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.calendarGrid}>
              {CHECKIN_REWARDS.map((reward) => {
                const status = getDayStatus(reward.day);
                const isClaimed = status === 'claimed';
                const isAvailable = status === 'available';
                const isLocked = status === 'locked';

                return (
                  <View key={reward.day} style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayNumber}>Ngày {reward.day}</Text>
                      {isClaimed && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                      {isAvailable && (
                        <View style={styles.availableBadge}>
                          <Text style={styles.availableText}>Hôm nay</Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.rewardCard,
                        isClaimed && styles.rewardCardClaimed,
                        isAvailable && styles.rewardCardAvailable,
                        isLocked && styles.rewardCardLocked,
                      ]}
                    >
                      {isLocked ? (
                        <View style={styles.lockedContent}>
                          <Text style={styles.lockedIcon}>🔒</Text>
                          <Text style={styles.lockedText}>Chưa mở khóa</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.rewardIcon}>
                            {getRewardIcon(reward)}
                          </View>
                          <Text style={styles.rewardLabel}>{reward.label}</Text>
                          <Text style={styles.rewardIconEmoji}>{reward.icon}</Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>💡 Lưu ý</Text>
              <Text style={styles.infoText}>
                • Điểm danh liên tục 7 ngày để nhận phần thưởng đặc biệt
              </Text>
              <Text style={styles.infoText}>
                • Nếu bỏ lỡ 1 ngày, chuỗi sẽ bắt đầu lại từ ngày 1
              </Text>
              <Text style={styles.infoText}>
                • Phần thưởng đặc biệt chỉ có ở ngày thứ 7!
              </Text>
            </View>
          </ScrollView>
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
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  streakInfo: {
    padding: 20,
    alignItems: 'center',
  },
  streakBadge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  streakSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
  },
  calendarGrid: {
    padding: 16,
    gap: 12,
  },
  dayCard: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  availableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FF6B9D',
  },
  availableText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  rewardCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  rewardCardClaimed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#34C759',
  },
  rewardCardAvailable: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B9D',
    borderStyle: 'dashed',
  },
  rewardCardLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
    opacity: 0.6,
  },
  lockedContent: {
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  rewardIcon: {
    marginBottom: 8,
  },
  rewardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  rewardIconEmoji: {
    fontSize: 24,
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB347',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});

