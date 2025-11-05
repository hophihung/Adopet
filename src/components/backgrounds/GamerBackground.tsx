import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface GamerBackgroundProps {
  children?: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
}

export function GamerBackground({
  children,
  intensity = 'medium',
}: GamerBackgroundProps) {
  const pulseAnim = useSharedValue(0);
  const scanAnim = useSharedValue(0);
  const gridAnim = useSharedValue(0);

  React.useEffect(() => {
    // Pulse animation
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Scan line animation
    scanAnim.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Grid animation
    gridAnim.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pulseAnim.value, [0, 1], [0.1, 0.3]);
    return { opacity };
  });

  const scanStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scanAnim.value, [0, 1], [-100, height + 100]);
    return {
      transform: [{ translateY }],
      opacity: interpolate(scanAnim.value, [0, 0.1, 0.9, 1], [0, 0.5, 0.5, 0]),
    };
  });

  const gridStyle = useAnimatedStyle(() => {
    const translateX = interpolate(gridAnim.value, [0, 1], [0, 40]);
    return { transform: [{ translateX }] };
  });

  const getIntensity = () => {
    switch (intensity) {
      case 'low':
        return { grid: 0.05, glow: 0.1 };
      case 'medium':
        return { grid: 0.1, glow: 0.2 };
      case 'high':
        return { grid: 0.15, glow: 0.3 };
      default:
        return { grid: 0.1, glow: 0.2 };
    }
  };

  const intensityValue = getIntensity();

  return (
    <View style={styles.container}>
      {/* Base gradient background */}
      <LinearGradient
        colors={['#0A0E27', '#1A1F3A', '#252A4A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Grid pattern */}
      <Animated.View style={[styles.gridContainer, gridStyle]}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineVertical, { left: i * 40 }]} />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridLineHorizontal, { top: i * 40 }]} />
        ))}
      </Animated.View>

      {/* Glow effects */}
      <Animated.View style={[styles.glow, styles.glow1, pulseStyle]} />
      <Animated.View style={[styles.glow, styles.glow2, pulseStyle]} />

      {/* Scan line effect */}
      <Animated.View style={[styles.scanLine, scanStyle]} />

      {/* Corner accents */}
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#6366F1',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
  },
  glow: {
    position: 'absolute',
    borderRadius: 200,
  },
  glow1: {
    width: 300,
    height: 300,
    backgroundColor: '#6366F1',
    top: -150,
    left: -150,
    opacity: 0.2,
  },
  glow2: {
    width: 400,
    height: 400,
    backgroundColor: '#818CF8',
    bottom: -200,
    right: -200,
    opacity: 0.15,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#6366F1',
    borderWidth: 2,
    opacity: 0.6,
  },
  cornerTopLeft: {
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 20,
    right: 20,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 20,
    left: 20,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 20,
    right: 20,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});

