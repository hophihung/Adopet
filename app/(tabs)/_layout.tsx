// import { Tabs } from 'expo-router';
// import { Heart, Video } from 'lucide-react-native';

// export default function TabLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: '#FF6B6B',
//         tabBarInactiveTintColor: '#999',
//         tabBarStyle: {
//           backgroundColor: '#fff',
//           borderTopWidth: 1,
//           borderTopColor: '#f0f0f0',
//           height: 60,
//           paddingBottom: 8,
//           paddingTop: 8,
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: '600',
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Match',
//           tabBarIcon: ({ size, color }) => (
//             <Heart size={size} color={color} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="reel"
//         options={{
//           title: 'Reel',
//           tabBarIcon: ({ size, color }) => (
//             <Video size={size} color={color} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }

import { Tabs } from 'expo-router';
import { Flame, Users, Sparkles, MessageCircle, User } from 'lucide-react-native';
import { View, Text } from 'react-native';

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
      {/* 🔥 Match */}
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Flame size={28} color={color} />
          ),
        }}
      />

      {/* 👥 Community */}
      <Tabs.Screen
        name="community"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <Users size={26} color={color} />
          ),
        }}
      />

      {/* ✨ Explore (có badge) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Sparkles size={26} color={color} />
              {/* Badge */}
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -8,
                  backgroundColor: '#FF5A75',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>6</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* 💬 Chat */}
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

      {/* 👤 Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => (
            <User size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
