import { PRIVY_CONFIG } from '@/config/privy';
import { useWalletStore } from '@/store/walletStore';
import { PrivyProvider, usePrivy } from '@privy-io/expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function RootNavigator() {
  const { isReady, user, logout } = usePrivy();
  const hydrate = useWalletStore((state) => state.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const checkForFreshInstall = async () => {
      const hasLaunchedBefore = await AsyncStorage.getItem('hasLaunchedBefore');
      if (!hasLaunchedBefore) {
        await AsyncStorage.setItem('hasLaunchedBefore', 'true');
        await logout();
      }
    };
    checkForFreshInstall();
  }, [logout]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // User is not authenticated and trying to access protected routes
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // User is authenticated but on auth pages, redirect to home
      router.replace('/(tabs)');
    }
  }, [isReady, user, segments]);

  // Show loading screen while Privy initializes
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="subscriptions/browse" />
      <Stack.Screen name="subscriptions/[id]" />
      <Stack.Screen name="wallet/deposit" />
      <Stack.Screen name="wallet/withdraw" />
      <Stack.Screen name="wallet/yield" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PrivyProvider
        appId={PRIVY_CONFIG.appId}
        clientId={PRIVY_CONFIG.clientId}
      >
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryClientProvider>
      </PrivyProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});