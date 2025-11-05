import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { ProfileProvider } from '../src/features/profile/context/ProfileContext';

function RootLayoutNav() {
  const { user, profile, loading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentScreen = segments[segments.length - 1];

    if (!user) {
      // Chưa đăng nhập -> redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Đã đăng nhập
      if (!profile) {
        // Chưa có profile -> redirect to select role
        if (currentScreen !== 'select-role') {
          router.replace('/(auth)/select-role');
        }
      } else if (!hasCompletedOnboarding) {
        // Có profile nhưng chưa hoàn thành onboarding -> redirect to filter
        if (currentScreen !== 'filter-pets') {
          router.replace('/(auth)/filter-pets');
        }
      } else {
        // Đã hoàn thành tất cả -> vào main app
        if (inAuthGroup) {
          router.replace('/(tabs)/discover/match');
        }
      }
    }
  }, [user, profile, loading, hasCompletedOnboarding, segments]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SubscriptionProvider>
          <ProfileProvider>
            <RootLayoutNav />
          </ProfileProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
