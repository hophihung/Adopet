import { Tabs } from 'expo-router';
import { Heart, Search } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

export default function DiscoverTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          display: 'none', // Ẩn tab bar - chỉ hiển thị header tabs
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="match"
        options={{
          href: null, // Ẩn khỏi tab bar - di chuyển lên header
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Ẩn khỏi tab bar - di chuyển lên header
        }}
      />
      <Tabs.Screen
        name="reel"
        options={{
          href: null, // Ẩn khỏi tab bar
        }}
      />
    </Tabs>
  );
}

