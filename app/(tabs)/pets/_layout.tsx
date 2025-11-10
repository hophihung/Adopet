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
          display: 'none', // Ẩn tab bar - chỉ hiển thị header tabs
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

