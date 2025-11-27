import { Tabs } from 'expo-router';
import { Home, MessageCircle, PawPrint, User } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          paddingHorizontal: 16,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 25 : 16,
          borderRadius: 28,
          borderTopWidth: 0,
          position: 'absolute',
          elevation: 16,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      {/* Trang chủ - hub dẫn tới các tính năng chính */}
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Home size={26} color={color} />,
        }}
      />

      {/* Tìm thú cưng */}
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Tìm thú cưng',
          tabBarIcon: ({ color }) => <PawPrint size={26} color={color} />,
        }}
      />

      {/* Tin nhắn */}
      <Tabs.Screen
        name="social"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color }) => <MessageCircle size={26} color={color} />,
        }}
      />


      {/* Tài khoản */}
      <Tabs.Screen
        name="me"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <User size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
