import { useState, useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';
import { useWalletStore } from '@/store/walletStore';


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
  const publicKey = useWalletStore((state) => state.publicKey);
  const authToken = useWalletStore((state) => state.authToken)
  const [data, setData] = useState<SubscriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  let authHeader: string;

  if (authToken) {
    authHeader = `Bearer ${authToken}`;
  }

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!publicKey) {
        setData([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}`,
          {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch subscriptions');
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
    };

    fetchSubscriptions();
  }, [publicKey]);

  const refetch = async () => {
    if (!publicKey) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}`,
        {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const subscriptions = await response.json();
      setData(subscriptions);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch };
}

export function useUpcomingPayments() {
  const publicKey = useWalletStore((state) => state.publicKey);
  const authToken = useWalletStore((state) => state.authToken)
  const [data, setData] = useState<UpcomingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  let authHeader: string;

  if (authToken) {
    authHeader = `Bearer ${authToken}`;
  }

  useEffect(() => {
    const fetchUpcomingPayments = async () => {
      if (!publicKey) {
        setData([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}/upcoming`,
          {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
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
    };

    fetchUpcomingPayments();
  }, [publicKey]);

  return { data, isLoading, error };
}

export function useSubscription(subscriptionPda: string) {
  const authToken = useWalletStore((state) => state.authToken)
  const [data, setData] = useState<SubscriptionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  let authHeader: string;

  if (authToken) {
    authHeader = `Bearer ${authToken}`;
  }

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${APP_CONFIG.APP_URL}/subscriptions/${subscriptionPda}`,
          {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
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
    };

    if (subscriptionPda) {
      fetchSubscription();
    }
  }, [subscriptionPda]);

  const refetch = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${APP_CONFIG.APP_URL}/subscriptions/${subscriptionPda}`
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
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch };
}

export function useUserStats() {
  const publicKey = useWalletStore((state) => state.publicKey);
  const authToken = useWalletStore((state) => state.authToken)
  const [data, setData] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  let authHeader: string;

  if (authToken) {
    authHeader = `Bearer ${authToken}`;
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!publicKey) {
        setData(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `${APP_CONFIG.APP_URL}/subscriptions/user/${publicKey}/stats`,
          {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
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
    };

    fetchStats();
  }, [publicKey]);

  return { data, isLoading, error };
}