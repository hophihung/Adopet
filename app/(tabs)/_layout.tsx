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
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          paddingHorizontal: 16,
          marginHorizontal: 20,
          marginBottom: 20,
          borderRadius: 28, // More rounded
          borderTopWidth: 0,
          position: 'absolute',
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
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
