import { Tabs } from 'expo-router';
import { Users, MessageCircle } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';
import { View } from 'react-native';

export default function SocialTabLayout() {
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
        name="community"
        options={{
          title: 'Cộng đồng',
          tabBarIcon: ({ color, size }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // Ẩn khỏi tab bar - di chuyển lên header
        }}
      />
    </Tabs>
  );
}

