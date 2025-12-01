import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Compass, Users, PawPrint, User, MessageCircle } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route: string;
}

const TABS: TabItem[] = [
  { id: 'discover', label: 'Khám phá', icon: Compass, route: '/(tabs)/discover/match' },
  { id: 'social', label: 'Cộng đồng', icon: Users, route: '/(tabs)/social/community' },
  { id: 'chat', label: 'Tin nhắn', icon: MessageCircle, route: '/(tabs)/social/chat' },
  { id: 'pets', label: 'Pets', icon: PawPrint, route: '/(tabs)/pets/my-pets' },
  { id: 'me', label: 'Tôi', icon: User, route: '/(tabs)/me/profile' },
];

export function HeaderNavigation() {
  const router = useRouter();
  const segments = useSegments();

  const getActiveTab = (): string => {
    const currentSegment = segments[1]; // Get main tab segment
    
    if (currentSegment === 'discover') return 'discover';
    if (currentSegment === 'social') {
      // Check if it's chat or community
      return segments[2] === 'chat' ? 'chat' : 'social';
    }
    if (currentSegment === 'pets') return 'pets';
    if (currentSegment === 'me') return 'me';
    
    return 'discover';
  };

  const activeTab = getActiveTab();

  const handleTabPress = (tab: TabItem) => {
    if (activeTab !== tab.id) {
      router.replace(tab.route as any);
    }
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <Icon size={22} color={isActive ? colors.primary : colors.textTertiary} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.tabBarBackground,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
    flex: 1,
  },
  tabActive: {
    // Active state styling
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: 4,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{ translateX: -8 }],
    width: 16,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});

