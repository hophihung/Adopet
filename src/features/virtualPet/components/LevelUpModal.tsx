import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  onClose: () => void;
  petEmoji?: string;
}

export function LevelUpModal({
  visible,
  level,
  onClose,
  petEmoji = '🎉',
}: LevelUpModalProps) {
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Start animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <LinearGradient
            colors={['#FF6B9D', '#FF8E53', '#FFB347']}
            style={styles.gradient}
          >
            {/* Sparkle effects */}
            <View style={styles.sparkleContainer}>
              <Sparkles size={24} color="#FFF" style={styles.sparkle1} />
              <Sparkles size={20} color="#FFF" style={styles.sparkle2} />
              <Sparkles size={22} color="#FFF" style={styles.sparkle3} />
              <Sparkles size={18} color="#FFF" style={styles.sparkle4} />
            </View>

            {/* Pet emoji */}
            <Text style={styles.petEmoji}>{petEmoji}</Text>

            {/* Level up text */}
            <Text style={styles.title}>Level Up!</Text>
            <Text style={styles.levelText}>Cấp độ {level}</Text>
            <Text style={styles.subtitle}>
              Pet của bạn đã lớn hơn! 🎊
            </Text>

            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <LinearGradient
                colors={['#FFF', '#F0F0F0']}
                style={styles.closeButtonGradient}
              >
                <Text style={styles.closeButtonText}>Tuyệt vời!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
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
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  sparkleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  sparkle1: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  sparkle2: {
    position: 'absolute',
    top: 30,
    right: 30,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 40,
    left: 30,
  },
  sparkle4: {
    position: 'absolute',
    bottom: 50,
    right: 20,
  },
  petEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  levelText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B9D',
  },
});

