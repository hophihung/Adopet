import { Tabs } from 'expo-router';
import {
  Users,
  MessageCircle,
  User,
  Heart,
  PawPrint,
  Bell,
} from 'lucide-react-native';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5A75',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* ========================================
          PHẦN 1: CÁC ROUTE ẨN (ĐẶT Ở ĐẦU)
          ======================================== */}

      {/* Ẩn Explore khỏi Bottom Tab Bar */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      {/* Ẩn Reel khỏi Bottom Tab Bar */}
      <Tabs.Screen
        name="reel"
        options={{
          // tabBarButton: () => null,
          href: null,
        }}
      />

      {/* ========================================
          PHẦN 2: CÁC NÚT HIỂN THỊ TRÊN BOTTOM BAR
          ======================================== */}

      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Heart size={26} color={color} />,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Users size={26} color={color} />,
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MessageCircle size={26} color={color} />
              {/* chấm đỏ thông báo */}
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#FF5A75',
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="my-pets"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <PawPrint size={26} color={color} />,
        }}
      />

      <Tabs.Screen
        name="reminders"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Bell size={26} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <User size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
