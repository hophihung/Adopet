import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      // Chưa đăng nhập -> redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Đã đăng nhập
      if (!profile) {
        // Chưa có profile -> redirect to select role
        router.replace('/(auth)/select-role');
      } else {
        // Có profile rồi -> vào main app
        if (inAuthGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, profile, loading, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
