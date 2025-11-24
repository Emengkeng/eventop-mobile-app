import { useState, useEffect, useCallback } from 'react';
import { usePhantomDeeplinkWalletConnector } from '@privy-io/expo/connectors';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Alert } from 'react-native';
import {
  subscriptionService,
  SubscriptionWalletData,
  SubscriptionStateData,
  getSubscriptionService,
} from '@/services/SubscriptionProtocolService';
import { APP_CONFIG } from '@/config/app';

/**
 * Hook for managing subscription wallet operations
 */
export function useSubscriptionWallet(userPublicKey?: string, redirectUri?: string) {
  const [walletPDA, setWalletPDA] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<SubscriptionWalletData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  const {
    signAndSendTransaction,
  } = usePhantomDeeplinkWalletConnector({
    appUrl: APP_CONFIG.APP_URL,
    redirectUri: redirectUri || '/wallet',
  });

  // Derive and fetch wallet PDA
  useEffect(() => {
    if (userPublicKey) {
      deriveWalletPDA();
    }
  }, [userPublicKey]);

  const deriveWalletPDA = async () => {
    if (!userPublicKey) return;

    try {
      const [pda] = await subscriptionService.findSubscriptionWalletPDA(
        new PublicKey(userPublicKey)
      );
      
      // Check if the account actually exists on-chain
      const data = await subscriptionService.getSubscriptionWallet(pda);
      
      if (data) {
        // Wallet exists
        setWalletPDA(pda.toString());
        setWalletData(data);
        
        // Fetch balance
        const bal = await subscriptionService.getWalletBalance(
          new PublicKey(userPublicKey)
        );
        setBalance(bal);
      } else {
        // Wallet doesn't exist yet
        setWalletPDA(null);
        setWalletData(null);
        setBalance(0);
      }
    } catch (error) {
      console.error('Error deriving wallet PDA:', error);
      setWalletPDA(null);
      setWalletData(null);
      setBalance(0);
    }
  };

  const fetchWalletData = async (pda?: string) => {
    const targetPDA = pda || walletPDA;
    if (!targetPDA) return;

    try {
      setRefreshing(true);
      const data = await subscriptionService.getSubscriptionWallet(
        new PublicKey(targetPDA)
      );
      
      if (data) {
        setWalletData(data);

        if (userPublicKey) {
          const bal = await subscriptionService.getWalletBalance(
            new PublicKey(userPublicKey)
          );
          setBalance(bal);
        }
      } else {
        // Account no longer exists or was closed
        setWalletPDA(null);
        setWalletData(null);
        setBalance(0);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      // Don't clear state on error - might be network issue
    } finally {
      setRefreshing(false);
    }
  };

  const createWallet = async (): Promise<boolean> => {
    if (!userPublicKey) {
      Alert.alert('Error', 'User public key not found');
      return false;
    }

    setLoading(true);
    try {
      const transaction = await subscriptionService.createSubscriptionWallet(
        new PublicKey(userPublicKey)
      );

      const signature = await signAndSendTransaction(transaction);

      Alert.alert('Success', 'Subscription wallet created successfully!');
      
      await deriveWalletPDA();
      return true;
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      Alert.alert('Error', error.message || 'Failed to create wallet');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (amount: number): Promise<boolean> => {
    if (!userPublicKey) {
      Alert.alert('Error', 'User public key not found');
      return false;
    }

    setLoading(true);
    try {
      const transaction = await subscriptionService.depositToWallet(
        new PublicKey(userPublicKey),
        amount
      );

      const signature = await signAndSendTransaction(transaction);

      Alert.alert(
        'Success',
        `Deposited ${amount} USDC successfully!`,
        [
          {
            text: 'View Transaction',
            onPress: () => {
              const url = subscriptionService.getExplorerUrl(signature.signature, 'tx');
              console.log('Transaction:', url);
            },
          },
          { text: 'OK' },
        ]
      );

      await fetchWalletData();
      return true;
    } catch (error: any) {
      console.error('Error depositing:', error);
      Alert.alert('Error', error.message || 'Failed to deposit');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (amount: number): Promise<boolean> => {
    if (!userPublicKey) {
      Alert.alert('Error', 'User public key not found');
      return false;
    }

    setLoading(true);
    try {
      const transaction = await subscriptionService.withdrawFromWallet(
        new PublicKey(userPublicKey),
        amount
      );

      const signature = await signAndSendTransaction(transaction);

      Alert.alert('Success', `Withdrew ${amount} USDC successfully!`);

      await fetchWalletData();
      return true;
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      Alert.alert('Error', error.message || 'Failed to withdraw');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(() => {
    fetchWalletData();
  }, [walletPDA]);

  return {
    walletPDA,
    walletData,
    balance,
    loading,
    refreshing,
    createWallet,
    deposit,
    withdraw,
    refresh,
  };
}

/**
 * Hook for managing subscriptions
 */
export function useSubscriptions(userPublicKey?: string) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionStateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    signAndSendTransaction,
  } = usePhantomDeeplinkWalletConnector({
    appUrl: APP_CONFIG.APP_URL,
    redirectUri: '/subscriptions',
  });

  useEffect(() => {
    if (userPublicKey) {
      fetchSubscriptions();
    }
  }, [userPublicKey]);

  const fetchSubscriptions = async () => {
    if (!userPublicKey) return;

    try {
      setRefreshing(true);
      const subs = await subscriptionService.getUserSubscriptions(
        new PublicKey(userPublicKey)
      );
      setSubscriptions(subs);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const subscribe = async (
    merchantPublicKey: string,
    planId: string
  ): Promise<boolean> => {
    if (!userPublicKey) {
      Alert.alert('Error', 'User public key not found');
      return false;
    }

    setLoading(true);
    try {
      const transaction = await subscriptionService.subscribeWithWallet(
        new PublicKey(userPublicKey),
        new PublicKey(merchantPublicKey),
        planId
      );

      const signature = await signAndSendTransaction(transaction);

      Alert.alert('Success', 'Subscription created successfully!');

      await fetchSubscriptions();
      return true;
    } catch (error: any) {
      console.error('Error subscribing:', error);
      Alert.alert('Error', error.message || 'Failed to subscribe');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async (merchantPublicKey: string): Promise<boolean> => {
    if (!userPublicKey) {
      Alert.alert('Error', 'User public key not found');
      return false;
    }

    setLoading(true);
    try {
      const transaction = await subscriptionService.executePayment(
        new PublicKey(userPublicKey),
        new PublicKey(merchantPublicKey)
      );

      const signature = await signAndSendTransaction(transaction);

      Alert.alert('Success', 'Payment executed successfully!');

      await fetchSubscriptions();
      return true;
    } catch (error: any) {
      console.error('Error executing payment:', error);
      Alert.alert('Error', error.message || 'Failed to execute payment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (merchantPublicKey: string): Promise<boolean> => {
    if (!userPublicKey) {
      Alert.alert('Error', 'User public key not found');
      return false;
    }

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const transaction = await subscriptionService.cancelSubscription(
                new PublicKey(userPublicKey),
                new PublicKey(merchantPublicKey)
              );

              const signature = await signAndSendTransaction(transaction);

              Alert.alert('Success', 'Subscription cancelled successfully!');

              await fetchSubscriptions();
            } catch (error: any) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Error', error.message || 'Failed to cancel subscription');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );

    return false; // Return false immediately as we show confirmation
  };

  const refresh = useCallback(() => {
    fetchSubscriptions();
  }, [userPublicKey]);

  return {
    subscriptions,
    loading,
    refreshing,
    subscribe,
    executePayment,
    cancelSubscription,
    refresh,
  };
}