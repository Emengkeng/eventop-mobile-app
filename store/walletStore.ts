import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicKey } from '@solana/web3.js';

interface WalletState {
  publicKey: string | null;
  authToken: string | null;
  isConnected: boolean;
  subscriptionWalletPda: string | null;
  balance: {
    total: number;
    committed: number;
    available: number;
    yieldEnabled: boolean;
  };
  
  // Actions
  setWallet: (publicKey: string, authToken: string) => Promise<void>;
  setSubscriptionWallet: (pda: string) => Promise<void>;
  updateBalance: (balance: Partial<WalletState['balance']>) => void;
  disconnect: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  authToken: null,
  isConnected: false,
  subscriptionWalletPda: null,
  balance: {
    total: 0,
    committed: 0,
    available: 0,
    yieldEnabled: false,
  },

  setWallet: async (publicKey, authToken) => {
    try {
      await AsyncStorage.multiSet([
        ['wallet.publicKey', publicKey],
        ['wallet.authToken', authToken],
      ]);
      set({ publicKey, authToken, isConnected: true });
    } catch (error) {
      console.error('Failed to save wallet:', error);
    }
  },

  setSubscriptionWallet: async (pda) => {
    try {
      await AsyncStorage.setItem('wallet.subscriptionPda', pda);
      set({ subscriptionWalletPda: pda });
    } catch (error) {
      console.error('Failed to save subscription wallet:', error);
    }
  },

  updateBalance: (balance) => {
    set((state) => ({
      balance: { ...state.balance, ...balance },
    }));
  },

  disconnect: async () => {
    try {
      await AsyncStorage.multiRemove([
        'wallet.publicKey',
        'wallet.authToken',
        'wallet.subscriptionPda',
      ]);
      set({
        publicKey: null,
        authToken: null,
        isConnected: false,
        subscriptionWalletPda: null,
        balance: {
          total: 0,
          committed: 0,
          available: 0,
          yieldEnabled: false,
        },
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  },

  hydrate: async () => {
    try {
      const [publicKey, authToken, subscriptionPda] = await AsyncStorage.multiGet([
        'wallet.publicKey',
        'wallet.authToken',
        'wallet.subscriptionPda',
      ]);

      const publicKeyValue = publicKey[1];
      const authTokenValue = authToken[1];
      const subscriptionPdaValue = subscriptionPda[1];

      if (publicKeyValue && authTokenValue) {
        set({
          publicKey: publicKeyValue,
          authToken: authTokenValue,
          isConnected: true,
          subscriptionWalletPda: subscriptionPdaValue || null,
        });
      }
    } catch (error) {
      console.error('Failed to hydrate wallet:', error);
    }
  },
}));