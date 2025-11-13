import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Utensils, Gamepad2, Sparkles, Zap } from 'lucide-react-native';

interface PetInteractionsProps {
  onFeed: () => Promise<{ success: boolean; exp_gain: number; mood_gain: number; error?: string }>;
  onPlay: () => Promise<{ success: boolean; exp_gain: number; mood_gain: number; error?: string }>;
  onClean: () => Promise<{ success: boolean; mood_gain: number; error?: string }>;
  lastFeedDate?: string | null;
  lastCleanDate?: string | null;
  lastPlayTime?: string | null;
}

const ACTION_COOLDOWN = 5 * 60 * 1000; // 5 minutes cho play

export function PetInteractions({ onFeed, onPlay, onClean, lastFeedDate, lastCleanDate, lastPlayTime }: PetInteractionsProps) {
  const [loading, setLoading] = useState<'feed' | 'play' | 'clean' | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Realtime cooldown timer
  useEffect(() => {
    if (!lastPlayTime) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const now = new Date().getTime();
      const last = new Date(lastPlayTime).getTime();
      const remaining = ACTION_COOLDOWN - (now - last);
      
      if (remaining <= 0) {
        setCooldownRemaining(0);
      } else {
        setCooldownRemaining(remaining);
      }
    };

    // Update immediately
    updateCooldown();

    // Update every second
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [lastPlayTime]);

  // Check if can feed today (1 lần/ngày)
  const canFeedToday = (): boolean => {
    if (!lastFeedDate) return true;
    const today = new Date().toISOString().split('T')[0];
    const lastFeed = new Date(lastFeedDate).toISOString().split('T')[0];
    return today !== lastFeed;
  };

  // Check if can clean today (1 lần/ngày)
  const canCleanToday = (): boolean => {
    if (!lastCleanDate) return true;
    const today = new Date().toISOString().split('T')[0];
    const lastClean = new Date(lastCleanDate).toISOString().split('T')[0];
    return today !== lastClean;
  };

  // Check if can play (cooldown 5 phút)
  const canPlay = (): boolean => {
    return cooldownRemaining <= 0;
  };

  const getPlayCooldownText = (): string => {
    if (cooldownRemaining <= 0) return '';
    const minutes = Math.floor(cooldownRemaining / 60000);
    const seconds = Math.floor((cooldownRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFeed = async () => {
    if (!canFeedToday()) {
      Alert.alert('Đã dùng hôm nay!', 'Bạn đã cho ăn hôm nay rồi. Hãy đợi đến ngày mai!');
      return;
    }

    setLoading('feed');
    try {
      const result = await onFeed();
      if (result.success) {
        Alert.alert('Yummy! 🍖', `+${result.exp_gain} EXP, +${result.mood_gain} Mood`);
      } else if (result.error) {
        Alert.alert('Thông báo', result.error);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cho ăn');
    } finally {
      setLoading(null);
    }
  };

  const handlePlay = async () => {
    if (!canPlay()) {
      Alert.alert('Chờ một chút!', `Còn ${getPlayCooldownText()} để chơi lại`);
      return;
    }

    setLoading('play');
    try {
      const result = await onPlay();
      if (result.success) {
        // Cooldown will be updated from lastPlayTime prop
        Alert.alert('Vui vẻ! 🎮', `+${result.exp_gain} EXP, +${result.mood_gain} Mood`);
      } else if (result.error) {
        Alert.alert('Thông báo', result.error);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chơi');
    } finally {
      setLoading(null);
    }
  };

  const handleClean = async () => {
    if (!canCleanToday()) {
      Alert.alert('Đã dùng hôm nay!', 'Bạn đã tắm hôm nay rồi. Hãy đợi đến ngày mai!');
      return;
    }

    setLoading('clean');
    try {
      const result = await onClean();
      if (result.success) {
        Alert.alert('Sạch sẽ! ✨', `+${result.mood_gain} Mood`);
      } else if (result.error) {
        Alert.alert('Thông báo', result.error);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tắm');
    } finally {
      setLoading(null);
    }
  };

  const feedDisabled = loading === 'feed' || !canFeedToday();
  const playDisabled = loading === 'play' || !canPlay();
  const cleanDisabled = loading === 'clean' || !canCleanToday();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tương tác với Pet</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionButton, feedDisabled && styles.actionButtonDisabled]}
          onPress={handleFeed}
          disabled={feedDisabled}
        >
          <LinearGradient
            colors={feedDisabled ? ['#CCC', '#BBB'] : ['#FF6B6B', '#FF8E53']}
            style={styles.actionGradient}
          >
            {loading === 'feed' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Utensils size={24} color="#FFF" />
                <Text style={styles.actionText}>Cho ăn</Text>
                <Text style={styles.actionSubtext}>
                  {canFeedToday() ? '+15 EXP, +5 Mood' : 'Đã dùng hôm nay'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, playDisabled && styles.actionButtonDisabled]}
          onPress={handlePlay}
          disabled={playDisabled}
        >
          <LinearGradient
            colors={playDisabled ? ['#CCC', '#BBB'] : ['#6366F1', '#8B5CF6']}
            style={styles.actionGradient}
          >
            {loading === 'play' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Gamepad2 size={24} color="#FFF" />
                <Text style={styles.actionText}>Chơi</Text>
                <Text style={styles.actionSubtext}>
                  {canPlay() ? '+25 EXP, +10 Mood' : `Cooldown: ${getPlayCooldownText()}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, cleanDisabled && styles.actionButtonDisabled]}
          onPress={handleClean}
          disabled={cleanDisabled}
        >
          <LinearGradient
            colors={cleanDisabled ? ['#CCC', '#BBB'] : ['#10B981', '#059669']}
            style={styles.actionGradient}
          >
            {loading === 'clean' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Sparkles size={24} color="#FFF" />
                <Text style={styles.actionText}>Tắm</Text>
                <Text style={styles.actionSubtext}>
                  {canCleanToday() ? '+8 Mood' : 'Đã dùng hôm nay'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  actionSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

