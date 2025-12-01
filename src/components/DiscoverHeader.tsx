import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Grid3x3, Video } from 'lucide-react-native';

export function DiscoverHeader() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: 'match', label: 'Match', icon: Heart, path: '/(tabs)/discover/match' },
    { key: 'explore', label: 'Explore', icon: Grid3x3, path: '/(tabs)/discover/explore' },
    { key: 'reel', label: 'Reels', icon: Video, path: '/(tabs)/discover/reel' },
  ];

  // Get active tab from segments
  const currentSegment = segments[segments.length - 1];
  const activeTab = tabs.find((tab) => tab.key === currentSegment)?.key || 'match';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Logo - No back button for home page */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🐾</Text>
        <Text style={styles.logoText}>Adopet</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => router.push(tab.path as any)}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.7}
            >
              <Icon size={18} color={isActive ? '#FF6B6B' : '#9CA3AF'} strokeWidth={2.5} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 28,
    marginRight: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFF0F0',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FF6B6B',
  },
});
