import { Tabs } from 'expo-router';
import { Compass, Users, PawPrint, User } from 'lucide-react-native';
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
      {/* Discover Group - Match + Explore */}
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, size }) => <Compass size={26} color={color} />,
        }}
      />

      {/* Social Group - Community + Chat */}
      <Tabs.Screen
        name="social"
        options={{
          title: 'Cộng đồng',
          tabBarIcon: ({ color, size }) => <Users size={26} color={color} />,
        }}
      />

      {/* Pets Group - My Pets + Virtual Pet */}
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarIcon: ({ color, size }) => <PawPrint size={26} color={color} />,
        }}
      />

      {/* Me Group - Reminders + Profile */}
      <Tabs.Screen
        name="me"
        options={{
          title: 'Tôi',
          tabBarIcon: ({ color, size }) => <User size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
