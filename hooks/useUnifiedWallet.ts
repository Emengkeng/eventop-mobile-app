import { useState, useEffect, useCallback } from 'react';
import { useEmbeddedSolanaWallet } from '@privy-io/expo';
import { PublicKey } from '@solana/web3.js';
import { UnifiedWalletService } from '@/services/UnifiedWalletService';
import { subscriptionService } from '@/services/SubscriptionProtocolService';
import { useSubscriptions } from './useSubscriptions';

export interface UnifiedBalance {
  total: number;
  available: number;
  committed: number;
}

export function useUnifiedWallet() {
  const { wallets, create: createSolanaWallet } = useEmbeddedSolanaWallet();
  const privyWallet = wallets?.[0];
  
  const { data: subscriptions, isLoading: subsLoading, refetch: refetchSubscriptions } = useSubscriptions();
  
  const [balance, setBalance] = useState<UnifiedBalance>({
    total: 0,
    available: 0,
    committed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicKey = privyWallet?.publicKey || null;
  const isConnected = !!publicKey;

  const loadBalance = useCallback(async () => {
    if (!privyWallet || !isConnected || subsLoading) {
      setBalance({ total: 0, available: 0, committed: 0 });
      return;
    }

    try {
      const committed = subscriptions
        .filter(sub => sub.isActive)
        .reduce((sum, sub) => {
          const monthlyFee = parseFloat(sub.feeAmount) / 1_000_000;
          return sum + (monthlyFee * 3); // 3 months buffer
        }, 0);

      const userPubkey = new PublicKey(privyWallet.publicKey);
      const subscriptionBalance = await subscriptionService.getWalletBalance(userPubkey);

      setBalance({
        total: subscriptionBalance,
        available: Math.max(0, subscriptionBalance - committed),
        committed,
      });
    } catch (err: any) {
      console.error('Failed to load balance:', err);
      setError(err.message);
    }
  }, [privyWallet, isConnected, subscriptions, subsLoading]);

  useEffect(() => {
    if (isConnected && !subsLoading) {
      loadBalance();
    }
  }, [isConnected, loadBalance, subsLoading]);

  /**
   * Deposit funds to subscription wallet
   */
  const deposit = useCallback(
    async (amount: number): Promise<string> => {
      if (!privyWallet) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const signature = await UnifiedWalletService.deposit(privyWallet, amount);
        
        await loadBalance();
        
        return signature;
      } catch (err: any) {
        console.error('Deposit failed:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [privyWallet, loadBalance]
  );

  /**
   * Withdraw funds from subscription wallet
   */
  const withdraw = useCallback(
    async (amount: number): Promise<string> => {
      if (!privyWallet) {
        throw new Error('Wallet not connected');
      }

      if (amount > balance.available) {
        throw new Error(
          `Insufficient available balance. You have $${balance.available.toFixed(2)} available, but $${balance.committed.toFixed(2)} is committed to active subscriptions.`
        );
      }

      setLoading(true);
      setError(null);

      try {
        const signature = await UnifiedWalletService.withdraw(privyWallet, amount);
        
        await loadBalance();
        
        return signature;
      } catch (err: any) {
        console.error('Withdraw failed:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [privyWallet, balance, loadBalance]
  );

  /**
   * Subscribe to a merchant plan
   */
  const subscribe = useCallback(
    async (
      merchantPublicKey: PublicKey,
      planId: string,
      sessionToken: string
    ): Promise<string> => {
      if (!privyWallet) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const userPubkey = new PublicKey(privyWallet.publicKey);
        const [subscriptionPDA] = await subscriptionService.findSubscriptionStatePDA(
          userPubkey,
          merchantPublicKey,
          subscriptionService.usdcMint
        );

        const existing = await subscriptionService.getSubscriptionState(subscriptionPDA);
        
        if (existing && existing.isActive) {
          throw new Error(
            'You already have an active subscription to this merchant. Please cancel your existing subscription before subscribing again.'
          );
        }

        const signature = await UnifiedWalletService.subscribe(
          privyWallet,
          merchantPublicKey,
          planId,
          sessionToken
        );
        
        await refetchSubscriptions();
        await loadBalance();
        
        return signature;
      } catch (err: any) {
        console.error('Subscribe failed:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [privyWallet, loadBalance, refetchSubscriptions]
  );

  /**
   * Cancel a subscription
   */
  const cancelSubscription = useCallback(
    async (merchantPublicKey: PublicKey): Promise<string> => {
      if (!privyWallet) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const userPubkey = new PublicKey(privyWallet.publicKey);
        const [subscriptionPDA] = await subscriptionService.findSubscriptionStatePDA(
          userPubkey,
          merchantPublicKey,
          subscriptionService.usdcMint
        );

        const subscription = await subscriptionService.getSubscriptionState(subscriptionPDA);
        
        if (!subscription) {
          throw new Error('Subscription not found');
        }

        if (!subscription.isActive) {
          throw new Error('This subscription is already cancelled');
        }

        const signature = await UnifiedWalletService.cancelSubscription(
          privyWallet,
          merchantPublicKey
        );
        
        console.log('✅ Subscription cancelled:', signature);
        
        await refetchSubscriptions();
        await loadBalance();
        
        return signature;
      } catch (err: any) {
        console.error('Cancel subscription failed:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [privyWallet, loadBalance, refetchSubscriptions]
  );

  /**
   * Ensure subscription wallet exists
   */
  const ensureWallet = useCallback(async (): Promise<boolean> => {
    if (!privyWallet) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const { needsCreation } = await UnifiedWalletService.ensureSubscriptionWallet(
        privyWallet
      );

      if (needsCreation) {
        await UnifiedWalletService.createSubscriptionWallet(privyWallet);
        console.log('✅ Subscription wallet created');
      }

      return true;
    } catch (err: any) {
      console.error('Ensure wallet failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [privyWallet]);

  return {
    publicKey,
    isConnected,
    balance,
    loading,
    error,

    deposit,
    withdraw,
    subscribe,
    cancelSubscription,
    ensureWallet,
    refreshBalance: loadBalance,
  };
}