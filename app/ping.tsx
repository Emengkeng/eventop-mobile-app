import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function PingScreen() {
  const router = useRouter();

  useEffect(() => {
    // Immediately go back or to home after confirming app is installed
    router.replace('/(tabs)');
  }, []);

  return <View />;
}