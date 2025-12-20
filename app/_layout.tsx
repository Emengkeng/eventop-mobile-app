import { PRIVY_CONFIG } from '@/config/privy';
import { useWalletStore } from '@/store/walletStore';
import { PrivyProvider, usePrivy } from '@privy-io/expo';
import { setAuthTokenGetter } from '@/services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, StyleSheet, Linking, Platform } from 'react-native';
import { colors } from '@/theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as QuickActions from 'expo-quick-actions';
import { RouterAction, useQuickActionRouting } from 'expo-quick-actions/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function RootNavigator() {
  useQuickActionRouting();
  const { isReady, user, logout, getAccessToken } = usePrivy();
  const hydrate = useWalletStore((state) => state.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isReady) {
      setAuthTokenGetter(getAccessToken);
    }
  }, [isReady, getAccessToken]);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    QuickActions.setItems<RouterAction>([
      {
        title: "Add Funds",
        subtitle: "Top up your wallet",
        icon: Platform.OS === "ios" ? "symbol:dollarsign.circle" : "add_funds_icon",
        id: "add_funds",
        params: { href: "./wallet/deposit" },
      },
      // {
      //   title: "Browse Plans",
      //   subtitle: "Discover subscriptions",
      //   icon: "browse_icon",
      //   id: "browse",
      //   params: { href: "/subscriptions/browse" },
      // },
      {
        title: "My Subscriptions",
        subtitle: "Manage your plans",
        icon: Platform.OS === "ios" ? "symbol:creditcard" : "subscriptions_icon",
        id: "subscriptions",
        params: { href: "./(tabs)/subscriptions" },
      },
      {
        title: "Need Help?",
        subtitle: "We're here for you",
        icon: Platform.OS === "ios" ? "symbol:person.crop.circle.badge.questionmark" : "help_icon",
        id: "help",
        params: { href: "./help" },
      },
    ]);
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
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, [isReady, user]);

  const handleDeepLink = (url: string) => {
    if (!url) return;

    console.log('📱 Deep link received:', url);

    if (url.includes('eventop://ping')) {
      console.log('✓ Ping received - app is installed');
      return;
    }

    if (url.includes('eventop://subscribe')) {
      const sessionId = url.split('sessionId=')[1]?.split('&')[0];
      
      if (sessionId) {
        if (!user) {
          AsyncStorage.setItem('pendingDeepLink', url);
        } else {
          router.push(`/subscribe/${sessionId}`);
        }
      }
    }
  };

  useEffect(() => {
    if (!isReady || !user) return;

    const checkPendingDeepLink = async () => {
      const pendingUrl = await AsyncStorage.getItem('pendingDeepLink');
      if (pendingUrl) {
        await AsyncStorage.removeItem('pendingDeepLink');
        handleDeepLink(pendingUrl);
      }
    };

    checkPendingDeepLink();
  }, [isReady, user]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isReady, user, segments]);

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
      <Stack.Screen name="ping" />
      <Stack.Screen name="subscriptions/browse" />
      <Stack.Screen name="subscriptions/[id]" />
      <Stack.Screen name="subscribe/[sessionId]" />
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