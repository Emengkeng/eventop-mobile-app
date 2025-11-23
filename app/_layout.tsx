import { PRIVY_CONFIG } from '@/config/privy';
import { useWalletStore } from '@/store/walletStore';
import { PrivyProvider } from '@privy-io/expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function RootNavigator() {
  const hydrate = useWalletStore((state) => state.hydrate);

  React.useEffect(() => {
    hydrate();
  }, []);

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

// import Constants from "expo-constants";
// import { Stack } from "expo-router";
// import { PrivyProvider } from "@privy-io/expo";
// import { PrivyElements } from "@privy-io/expo/ui";
// import {
//   Inter_400Regular,
//   Inter_500Medium,
//   Inter_600SemiBold,
// } from "@expo-google-fonts/inter";
// import { useFonts } from "expo-font";

// export default function RootLayout() {
//   useFonts({
//     Inter_400Regular,
//     Inter_500Medium,
//     Inter_600SemiBold,
//   });
//   return (
//     <PrivyProvider
//       appId={Constants.expoConfig?.extra?.privyAppId}
//       clientId={Constants.expoConfig?.extra?.privyClientId}
//     >
//       <Stack>
//         <Stack.Screen name="index" />
//       </Stack>
//       <PrivyElements />
//     </PrivyProvider>
//   );
// }
