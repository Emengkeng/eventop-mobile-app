import { useState, useEffect, useCallback } from 'react';
import { APP_CONFIG } from '@/config/app';
import { useWalletStore } from '@/store/walletStore';
import { useEmbeddedSolanaWallet, usePrivy } from '@privy-io/expo';

export interface SubscriptionData {
  subscriptionPda: string;
  userWallet: string;
  subscriptionWalletPda: string;
  merchantWallet: string;
  merchantPlanPda: string;
  mint: string;
  feeAmount: string;
  paymentInterval: string;
  lastPaymentTimestamp: string;
  totalPaid: string;
  paymentCount: number;
  isActive: boolean;
  customerEmail: string | null;
  customerId: string | null;
  sessionToken: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export interface UpcomingPayment {
  subscriptionPda: string;
  merchantWallet: string;
  amount: string;
  nextPaymentDate: string;
  daysUntil: number;
}

export interface SubscriptionDetail extends SubscriptionData {
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  signature: string;
  subscriptionPda: string;
  type: string;
  amount: string;
  fromWallet: string;
  toWallet: string;
  blockTime: string;
  slot: number;
  status: string;
  indexedAt: string;
}

export interface WalletBalance {
  walletPda: string;
  ownerWallet: string;
  mint: string;
  isYieldEnabled: boolean;
  yieldStrategy: string | null;
  yieldVault: string | null;
  totalSubscriptions: number;
  totalSpent: string;
  createdAt: string;
}

export interface UserStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalSpent: string;
  subscriptions: SubscriptionData[];
}

export function useSubscriptions() {
  const { user, getAccessToken } = usePrivy();
  const { wallets } = useEmbeddedSolanaWallet();
  const [data, setData] = useState<SubscriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const privyWallet = wallets?.[0];
  const publicKey = privyWallet?.publicKey;

  const fetchSubscriptions = useCallback(async () => {
    if (!publicKey) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      const authToken = await getAccessToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      console.log('Fetching subscriptions for:', publicKey);
      
      const response = await fetch(
        `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch subscriptions: ${response.status}`);
      }

      const subscriptions = await response.json();
      setData(subscriptions);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getAccessToken]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { data, isLoading, error, refetch: fetchSubscriptions };
}

export function useUpcomingPayments() {
  const { getAccessToken } = usePrivy();
  const { wallets } = useEmbeddedSolanaWallet();
  const [data, setData] = useState<UpcomingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const privyWallet = wallets?.[0];
  const publicKey = privyWallet?.publicKey;

  const fetchUpcomingPayments = useCallback(async () => {
    if (!publicKey) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      const authToken = await getAccessToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await fetch(
        `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}/upcoming`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch upcoming payments');
      }

      const payments = await response.json();
      setData(payments);
      setError(null);
    } catch (err) {
      console.error('Error fetching upcoming payments:', err);
      setError(err as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getAccessToken]);

  useEffect(() => {
    fetchUpcomingPayments();
  }, [fetchUpcomingPayments]);

  return { data, isLoading, error, refetch: fetchUpcomingPayments };
}

export function useSubscription(subscriptionPda: string) {
  const { getAccessToken } = usePrivy();
  const [data, setData] = useState<SubscriptionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!subscriptionPda) {
      setIsLoading(false);
      return;
    }

    try {
      const authToken = await getAccessToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await fetch(
        `${APP_CONFIG.APP_URL}/subscriptions/${subscriptionPda}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscription = await response.json();
      setData(subscription);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err as Error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionPda, getAccessToken]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { data, isLoading, error, refetch: fetchSubscription };
}

export function useUserStats() {
  const { getAccessToken } = usePrivy();
  const { wallets } = useEmbeddedSolanaWallet();
  const [data, setData] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const privyWallet = wallets?.[0];
  const publicKey = privyWallet?.publicKey;

  const fetchStats = useCallback(async () => {
    if (!publicKey) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      const authToken = await getAccessToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        setData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await fetch(
        `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const stats = await response.json();
      setData(stats);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err as Error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getAccessToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, isLoading, error, refetch: fetchStats };
}