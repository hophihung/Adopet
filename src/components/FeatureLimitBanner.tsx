import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface FeatureLimitBannerProps {
  featureName: string;
  currentUsage: number;
  limit: number | 'unlimited';
  onUpgrade: () => void;
  type?: 'warning' | 'error' | 'info';
}

export function FeatureLimitBanner({ 
  featureName, 
  currentUsage, 
  limit, 
  onUpgrade,
  type = 'warning'
}: FeatureLimitBannerProps) {
  const isUnlimited = limit === 'unlimited';
  const isNearLimit = !isUnlimited && currentUsage >= (limit as number) * 0.8;
  const isAtLimit = !isUnlimited && currentUsage >= (limit as number);

  if (isUnlimited || (!isNearLimit && !isAtLimit)) {
    return null;
  }

  const getBannerConfig = () => {
    if (isAtLimit) {
      return {
        colors: ['#ef4444', '#dc2626'],
        icon: 'warning' as const,
        title: 'Đã đạt giới hạn',
        message: `Bạn đã sử dụng hết ${limit} ${featureName.toLowerCase()}. Hãy nâng cấp để tiếp tục!`,
        buttonText: 'Nâng cấp ngay',
        buttonColor: '#ffffff'
      };
    } else if (isNearLimit) {
      return {
        colors: ['#f59e0b', '#d97706'],
        icon: 'alert-circle' as const,
        title: 'Sắp đạt giới hạn',
        message: `Bạn đã sử dụng ${currentUsage}/${limit} ${featureName.toLowerCase()}. Còn ${(limit as number) - currentUsage} lần nữa.`,
        buttonText: 'Nâng cấp sớm',
        buttonColor: '#ffffff'
      };
    }
    return {
      colors: ['#3b82f6', '#2563eb'],
      icon: 'information-circle' as const,
      title: 'Thông tin',
      message: `Bạn đã sử dụng ${currentUsage}/${limit} ${featureName.toLowerCase()}.`,
      buttonText: 'Xem chi tiết',
      buttonColor: '#ffffff'
    };
  };

  const config = getBannerConfig();

  return (
    <LinearGradient
      colors={config.colors as [string, string]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Ionicons name={config.icon} size={24} color="#ffffff" />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.message}>{config.message}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: config.buttonColor }]}
          onPress={onUpgrade}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: config.colors[0] }]}>
            {config.buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
