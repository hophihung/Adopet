import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  padding = 'medium',
  style,
}: CardProps) {
  const paddingKey = `padding${padding.charAt(0).toUpperCase() + padding.slice(1)}` as 'paddingNone' | 'paddingSmall' | 'paddingMedium' | 'paddingLarge';
  const cardStyle = [
    styles.card,
    styles[variant],
    styles[paddingKey],
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, // More rounded, modern
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  glass: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: 14,
  },
  paddingMedium: {
    padding: 20,
  },
  paddingLarge: {
    padding: 28,
  },
});

