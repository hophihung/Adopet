import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/src/theme/colors';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  showNotification?: boolean;
  showSettings?: boolean;
  notificationBadge?: number;
  transparent?: boolean;
}

export function Header({
  title,
  showBack = true,
  onBack,
  rightActions,
  showNotification = false,
  showSettings = false,
  notificationBadge = 0,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/discover/match');
      }
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, transparent && styles.transparent]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 12 }]}>
        {/* Left: Back button + Title */}
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={transparent ? '#fff' : colors.text} />
            </TouchableOpacity>
          )}
          {title && (
            <Text style={[styles.title, transparent && styles.titleTransparent]}>
              {title}
            </Text>
          )}
        </View>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {rightActions}
          {showNotification && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/me/notifications' as any)}
              activeOpacity={0.7}
            >
              <Bell size={20} color={transparent ? '#fff' : colors.text} />
              {notificationBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationBadge > 9 ? '9+' : notificationBadge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {showSettings && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/me/settings' as any)}
              activeOpacity={0.7}
            >
              <Settings size={20} color={transparent ? '#fff' : colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 10,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginRight: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  titleTransparent: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

