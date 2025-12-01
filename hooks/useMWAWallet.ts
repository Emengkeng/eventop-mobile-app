import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileWalletAdapterService } from '@/services/MobileWalletAdapterService';

const AUTH_TOKEN_KEY = 'mwa_auth_token';
const WALLET_ADDRESS_KEY = 'mwa_wallet_address';

export function useMWAWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load cached auth data
  const loadCachedAuth = useCallback(async () => {
    try {
      const cachedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const cachedAddress = await AsyncStorage.getItem(WALLET_ADDRESS_KEY);
      
      if (cachedToken && cachedAddress) {
        setAuthToken(cachedToken);
        setAddress(cachedAddress);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error loading cached auth:', error);
    }
  }, []);

  // Connect to wallet
  const connect = useCallback(async () => {
    setLoading(true);
    try {
      // Try to use cached auth token for quick reconnect
      const cachedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      const result = await MobileWalletAdapterService.authorize(
        cachedToken || undefined
      );

      setAddress(result.address);
      setAuthToken(result.authToken);
      setIsConnected(true);

      // Cache the auth data
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.authToken);
      await AsyncStorage.setItem(WALLET_ADDRESS_KEY, result.address);

      Alert.alert('Success', 'Wallet connected successfully!');
      return result;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      // Clear invalid cached data
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, WALLET_ADDRESS_KEY]);
      
      Alert.alert('Error', error.message || 'Failed to connect wallet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    if (!authToken) return;

    setLoading(true);
    try {
      await MobileWalletAdapterService.deauthorize(authToken);

      // Clear state and cache
      setAddress(null);
      setAuthToken(null);
      setIsConnected(false);
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, WALLET_ADDRESS_KEY]);

      Alert.alert('Success', 'Wallet disconnected');
    } catch (error: any) {
      console.error('Error disconnecting wallet:', error);
      Alert.alert('Error', error.message || 'Failed to disconnect wallet');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  return {
    address,
    authToken,
    isConnected,
    loading,
    connect,
    disconnect,
    loadCachedAuth,
  };
}