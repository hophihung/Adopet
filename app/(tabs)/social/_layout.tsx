import { Tabs } from 'expo-router';
import { Users, MessageCircle } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

export default function SocialTabLayout() {
  return (
    <Tabs
      initialRouteName="chat"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          display: 'none', // Ẩn tab bar - dùng header custom trong community/chat
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
          href: null,
          title: 'Cộng đồng',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
