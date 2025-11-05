import { Tabs } from 'expo-router';
import { PawPrint, Sparkles } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

export default function PetsTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="my-pets"
        options={{
          title: 'Pets của tôi',
          tabBarIcon: ({ color, size }) => <PawPrint size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="virtual-pet"
        options={{
          title: 'Pet ảo',
          tabBarIcon: ({ color, size }) => <Sparkles size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

