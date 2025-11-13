import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Zap, Trophy, Target } from 'lucide-react-native';

interface MiniGameProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (expGain: number) => void;
  canPlayToday: boolean;
  onPlayToday: () => void;
}

export function MiniGame({ visible, onClose, onComplete, canPlayToday, onPlayToday }: MiniGameProps) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [targets, setTargets] = useState<Array<{ id: number; x: number; y: number; active: boolean }>>([]);
  const [scaleAnim] = useState(new Animated.Value(1));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endGameRef = useRef<() => void>();

  // Set up endGame ref
  endGameRef.current = () => {
    setGameActive(false);
    const expGain = Math.floor(score / 2); // 2 points = 1 EXP
    if (expGain > 0) {
      onComplete(expGain);
      Alert.alert(
        'Game Over! 🎮',
        `Điểm số: ${score}\nNhận được: +${expGain} EXP!`,
        [{ text: 'OK', onPress: onClose }]
      );
    } else {
      Alert.alert('Game Over!', 'Hãy cố gắng hơn lần sau!', [{ text: 'OK', onPress: onClose }]);
    }
  };

  // Timer effect - chạy độc lập, không phụ thuộc vào targets
  useEffect(() => {
    if (visible && gameActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (endGameRef.current) {
              endGameRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [visible, gameActive]);

  // Target spawner effect - chạy độc lập
  useEffect(() => {
    if (visible && gameActive) {
      targetTimerRef.current = setInterval(() => {
        setTargets((prev) => {
          if (prev.length < 5) {
            const newTarget = {
              id: Date.now() + Math.random(),
              x: Math.random() * 80 + 10,
              y: Math.random() * 60 + 20,
              active: true,
            };
            // Auto remove after 3 seconds
            setTimeout(() => {
              setTargets((current) => current.filter((t) => t.id !== newTarget.id));
            }, 3000);
            return [...prev, newTarget];
          }
          return prev;
        });
      }, 1500);

      return () => {
        if (targetTimerRef.current) {
          clearInterval(targetTimerRef.current);
          targetTimerRef.current = null;
        }
      };
    } else {
      if (targetTimerRef.current) {
        clearInterval(targetTimerRef.current);
        targetTimerRef.current = null;
      }
    }
  }, [visible, gameActive]);

  const startGame = () => {
    if (!canPlayToday) {
      Alert.alert('Đã chơi hôm nay!', 'Bạn đã chơi mini game hôm nay rồi. Hãy đợi đến ngày mai!');
      return;
    }

    // Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (targetTimerRef.current) {
      clearInterval(targetTimerRef.current);
      targetTimerRef.current = null;
    }

    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setTargets([]);
    onPlayToday(); // Mark as played today
  };

  const hitTarget = (targetId: number) => {
    if (!gameActive) return; // Prevent hits after game ends
    
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
    setScore((prev) => prev + 10);

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setGameActive(false);
      setScore(0);
      setTimeLeft(30);
      setTargets([]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (targetTimerRef.current) {
        clearInterval(targetTimerRef.current);
        targetTimerRef.current = null;
      }
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.header}
          >
            <Text style={styles.title}>🎯 Mini Game</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.content}>
            {!gameActive ? (
              <View style={styles.startScreen}>
                <Target size={64} color="#6366F1" />
                <Text style={styles.instructionsTitle}>Cách chơi</Text>
                <Text style={styles.instructions}>
                  • Chạm vào các mục tiêu xuất hiện{'\n'}
                  • Mỗi mục tiêu = 10 điểm{'\n'}
                  • Thời gian: 30 giây{'\n'}
                  • EXP nhận được = Điểm / 2{'\n'}
                  • Chỉ chơi được 1 lần/ngày
                </Text>
                {!canPlayToday && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ Đã chơi hôm nay rồi! Hãy đợi đến ngày mai.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.startButton, !canPlayToday && styles.startButtonDisabled]}
                  onPress={startGame}
                  disabled={!canPlayToday}
                >
                  <LinearGradient
                    colors={canPlayToday ? ['#FF6B6B', '#FF8E53'] : ['#CCC', '#BBB']}
                    style={styles.startButtonGradient}
                  >
                    <Zap size={20} color="#FFF" />
                    <Text style={styles.startButtonText}>Bắt đầu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.gameScreen}>
                <View style={styles.gameHeader}>
                  <View style={styles.statBox}>
                    <Trophy size={20} color="#FFD700" />
                    <Text style={styles.statText}>Điểm: {score}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Zap size={20} color="#FF6B6B" />
                    <Text style={styles.statText}>{timeLeft}s</Text>
                  </View>
                </View>

                <View style={styles.gameArea}>
                  {targets.map((target) => (
                    <TouchableOpacity
                      key={target.id}
                      style={[
                        styles.target,
                        {
                          left: `${target.x}%`,
                          top: `${target.y}%`,
                        },
                      ]}
                      onPress={() => hitTarget(target.id)}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.targetInner,
                          { transform: [{ scale: scaleAnim }] },
                        ]}
                      >
                        <Text style={styles.targetText}>🎯</Text>
                      </Animated.View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    minHeight: 400,
  },
  startScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 12,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  gameScreen: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  gameArea: {
    width: '100%',
    height: 300,
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  target: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  targetText: {
    fontSize: 32,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    fontWeight: '600',
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
});

