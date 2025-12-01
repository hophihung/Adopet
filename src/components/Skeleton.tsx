import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonGridProps {
  count?: number;
  columns?: number;
}

export function SkeletonGrid({ count = 6, columns = 2 }: SkeletonGridProps) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.gridItem, { width: `${100 / columns - 2}%` }]}>
          <Skeleton height={200} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton height={16} width="80%" style={{ marginBottom: 4 }} />
          <Skeleton height={14} width="60%" />
        </View>
      ))}
    </View>
  );
}

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 5 }: SkeletonListProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <Skeleton width={60} height={60} borderRadius={30} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton height={16} width="70%" style={{ marginBottom: 8 }} />
            <Skeleton height={14} width="90%" style={{ marginBottom: 4 }} />
            <Skeleton height={12} width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={200} borderRadius={12} style={{ marginBottom: 12 }} />
      <Skeleton height={20} width="80%" style={{ marginBottom: 8 }} />
      <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton height={14} width="30%" />
        <Skeleton height={14} width="30%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.borderLight || '#E0E0E0',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  gridItem: {
    marginBottom: 16,
  },
  list: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  card: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
});
