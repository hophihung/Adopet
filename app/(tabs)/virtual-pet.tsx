import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, TrendingUp, Heart, Star, Sparkles } from 'lucide-react-native';
import { useVirtualPet } from '@/src/features/virtualPet/hooks/useVirtualPet';
import { LevelUpModal, petColors, petEmojis, PetSelectionModal, PetType } from '@/src/features/virtualPet';
import { CheckinCalendar } from '@/src/features/virtualPet/components/CheckinCalendar';
import { PixelPetAnimation } from '@/src/features/virtualPet/components/PixelPetAnimation';
import { getEvolutionStageName, getEvolutionStage } from '@/src/config/virtualPet/animations';



export default function VirtualPetScreen() {
  const {
    virtualPet,
    loading,
    error,
    checkingIn,
    hasCheckedInToday,
    daysSinceLastCheckin,
    expProgress,
    currentMoodState,
    createVirtualPet,
    dailyCheckin,
    fetchVirtualPet,
    hasVirtualPet,
  } = useVirtualPet();

  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showPetSelection, setShowPetSelection] = useState(false);
  const [showCheckinCalendar, setShowCheckinCalendar] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(1);

  // Track level changes
  useEffect(() => {
    if (virtualPet && virtualPet.level > previousLevel) {
      setShowLevelUpModal(true);
      setPreviousLevel(virtualPet.level);
    }
  }, [virtualPet?.level]);

  const handleDailyCheckin = async () => {
    try {
      const result = await dailyCheckin();
      if (result?.success) {
        if (result.level_up) {
          // Level up modal will be shown by useEffect
        } else {
          Alert.alert('Điểm danh thành công!', `+${result.exp_gain} EXP, +${result.mood_gain} Mood 🎉`);
        }
      } else {
        Alert.alert('Lỗi', result?.error || 'Không thể điểm danh');
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể điểm danh. Vui lòng thử lại.');
    }
  };

  const handleCreatePet = async (petType: PetType, name: string) => {
    try {
      await createVirtualPet({ pet_type: petType, name });
      setShowPetSelection(false);
      Alert.alert('Thành công!', `Đã tạo ${name}! 🎉`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo pet';
      Alert.alert('Lỗi', message);
    }
  };

  if (loading && !virtualPet) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!hasVirtualPet) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF6B9D', '#FF8E53']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Virtual Pet</Text>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>Chưa có Virtual Pet</Text>
          <Text style={styles.emptyDescription}>
            Tạo một virtual pet của riêng bạn và chăm sóc nó hàng ngày!
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowPetSelection(true)}
          >
            <LinearGradient
              colors={['#FF6B9D', '#FF8E53']}
              style={styles.createButtonGradient}
            >
              <Sparkles size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Tạo Virtual Pet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <PetSelectionModal
          visible={showPetSelection}
          onClose={() => setShowPetSelection(false)}
          onSelect={handleCreatePet}
        />
      </View>
    );
  }

  if (!virtualPet) return null;

  const colors = petColors[virtualPet.pet_type];
  const moodColor = virtualPet.mood >= 80 ? '#34C759' : virtualPet.mood >= 50 ? '#FF9500' : '#FF3B30';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{virtualPet.name}</Text>
            <Text style={styles.headerSubtitle}>
              {petEmojis[virtualPet.pet_type]} Level {virtualPet.level} • {getEvolutionStageName(getEvolutionStage(virtualPet.level))}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCheckinCalendar(true)}
          >
            <View style={styles.calendarButtonBadge}>
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.calendarButtonText}>{virtualPet.streak_days}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet Display */}
        <View style={styles.petContainer}>
          <View style={[styles.petBackground, { backgroundColor: colors.accent }]}>
            <PixelPetAnimation
              petType={virtualPet.pet_type}
              mood={currentMoodState}
              level={virtualPet.level}
              size={180}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {/* EXP Bar */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <TrendingUp size={20} color={colors.primary} />
              <Text style={styles.statTitle}>Kinh nghiệm</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={[styles.progressFill, { width: `${expProgress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {virtualPet.exp} / {virtualPet.exp_to_next_level} EXP
              </Text>
            </View>
          </View>

          {/* Mood Bar */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Heart size={20} color={moodColor} />
              <Text style={styles.statTitle}>Cảm xúc</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${virtualPet.mood}%`,
                      backgroundColor: moodColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: moodColor }]}>
                {virtualPet.mood} / 100
              </Text>
            </View>
          </View>

          {/* Streak */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.statTitle}>Chuỗi điểm danh</Text>
            </View>
            <Text style={styles.streakText}>{virtualPet.streak_days} ngày liên tiếp 🔥</Text>
            {daysSinceLastCheckin > 0 && (
              <Text style={styles.warningText}>
                {daysSinceLastCheckin} ngày chưa điểm danh
              </Text>
            )}
          </View>

          {/* Evolution Info */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={styles.statTitle}>Tiến hóa</Text>
            </View>
            <Text style={styles.evolutionText}>
              {getEvolutionStageName(getEvolutionStage(virtualPet.level))}
            </Text>
            {virtualPet.level < 50 && (
              <Text style={styles.evolutionNextText}>
                Tiến hóa tiếp: Level {virtualPet.level < 10 ? 10 : virtualPet.level < 30 ? 30 : 50}
              </Text>
            )}
            {virtualPet.level >= 50 && (
              <Text style={styles.evolutionMaxText}>
                ✨ Đã đạt level tối đa!
              </Text>
            )}
          </View>
        </View>

        {/* Daily Check-in Button */}
        <TouchableOpacity
          style={[
            styles.checkinButton,
            (hasCheckedInToday || checkingIn) && styles.checkinButtonDisabled,
          ]}
          onPress={handleDailyCheckin}
          disabled={hasCheckedInToday || checkingIn}
        >
          <LinearGradient
            colors={
              hasCheckedInToday || checkingIn
                ? ['#CCC', '#BBB']
                : [colors.primary, colors.secondary]
            }
            style={styles.checkinButtonGradient}
          >
            {checkingIn ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Calendar size={24} color="#FFF" />
                <Text style={styles.checkinButtonText}>
                  {hasCheckedInToday
                    ? 'Đã điểm danh hôm nay ✓'
                    : 'Điểm danh hôm nay 🐾'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Info Cards */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Star size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Điểm danh mỗi ngày để nhận +50 EXP và +10 Mood!
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Heart size={18} color="#FF3B30" />
            <Text style={styles.infoText}>
              Nếu không điểm danh hơn 2 ngày, Mood sẽ giảm -20 mỗi ngày
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Level Up Modal */}
      {virtualPet && (
        <LevelUpModal
          visible={showLevelUpModal}
          level={virtualPet.level}
          onClose={() => setShowLevelUpModal(false)}
          petEmoji={petEmojis[virtualPet.pet_type]}
        />
      )}

      {/* Pet Selection Modal */}
      <PetSelectionModal
        visible={showPetSelection}
        onClose={() => setShowPetSelection(false)}
        onSelect={handleCreatePet}
      />

      {/* Checkin Calendar Modal */}
      {virtualPet && (
        <CheckinCalendar
          visible={showCheckinCalendar}
          onClose={() => setShowCheckinCalendar(false)}
          streakDays={virtualPet.streak_days}
          hasCheckedInToday={hasCheckedInToday}
          petType={virtualPet.pet_type}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarButton: {
    padding: 8,
  },
  calendarButtonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  petContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  petBackground: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  streakText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  evolutionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  evolutionNextText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  evolutionMaxText: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 4,
    fontWeight: '600',
  },
  checkinButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  checkinButtonDisabled: {
    opacity: 0.6,
  },
  checkinButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  checkinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  infoContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 100,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});

