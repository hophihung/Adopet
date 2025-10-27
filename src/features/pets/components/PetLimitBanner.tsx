import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface PetLimitBannerProps {
  currentCount: number;
  limit: number;
  plan: string;
  onUpgrade?: () => void;
}

export function PetLimitBanner({ 
  currentCount, 
  limit, 
  plan, 
  onUpgrade 
}: PetLimitBannerProps) {
  const router = useRouter();
  const isNearLimit = currentCount >= limit * 0.8; // 80% of limit
  const isAtLimit = currentCount >= limit;

  if (!isNearLimit) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Redirect đến subscription page trong app (không phải auth flow)
      router.push('/subscription');
    }
  };

  return (
    <View style={[
      styles.container,
      isAtLimit ? styles.containerAtLimit : styles.containerNearLimit
    ]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isAtLimit ? 'Đã đạt giới hạn!' : 'Sắp đạt giới hạn!'}
        </Text>
        <Text style={styles.description}>
          {isAtLimit 
            ? `Bạn đã tạo ${currentCount}/${limit} pet objects với gói ${plan}. Hãy nâng cấp để tạo thêm!`
            : `Bạn đã tạo ${currentCount}/${limit} pet objects với gói ${plan}. Còn ${limit - currentCount} slot trống.`
          }
        </Text>
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={handleUpgrade}
        >
          <Text style={styles.upgradeButtonText}>
            {isAtLimit ? 'Nâng cấp ngay' : 'Nâng cấp để có thêm slot'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  containerNearLimit: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
  },
  containerAtLimit: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
