import { Tabs } from 'expo-router';
import { Compass, Users, PawPrint, User, Bell } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
