import { UnifiedWalletService } from "@/services/UnifiedWalletService";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";
import React from "react";
import { subscriptionService } from "@/services/SubscriptionProtocolService";

export function useUnifiedWallet() {
  const { wallets, create: createSolanaWallet } = useEmbeddedSolanaWallet();
  const privyWallet = wallets?.[0];

  const [balance, setBalance] = React.useState({
    total: 0,
    available: 0,
    committed: 0
  });
  const [loading, setLoading] = React.useState(false);
  const [walletCreating, setWalletCreating] = React.useState(false);

  const ensureWalletExists = async () => {
    if (privyWallet?.publicKey) {
      return privyWallet;
    }

    if (walletCreating) {
      return null;
    }

    setWalletCreating(true);
    try {
      const newWallet = await createSolanaWallet?.({
        createAdditional: false,
        recoveryMethod: "privy",
      });
      return newWallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    } finally {
      setWalletCreating(false);
    }
  };

  const refreshBalance = async () => {
    try {
      const wallet = await ensureWalletExists();
      if (!privyWallet?.publicKey) {
        console.warn('No wallet available to fetch balance');
        return;
      }

      setLoading(true);
      const bal = await UnifiedWalletService.getUnifiedBalance(wallet);
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (amount: number) => {
    const wallet = await ensureWalletExists();
    if (!wallet) throw new Error('Wallet not available');

    setLoading(true);
    try {
      const signature = await UnifiedWalletService.deposit(wallet, amount);
      await refreshBalance();
      return signature;
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (amount: number) => {
    const wallet = await ensureWalletExists();
    if (!wallet) throw new Error('Wallet not available');

    setLoading(true);
    try {
      const signature = await UnifiedWalletService.withdraw(wallet, amount);
      await refreshBalance();
      return signature;
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (merchantPubkey: PublicKey, planId: string) => {
    const wallet = await ensureWalletExists();
    if (!privyWallet?.publicKey) throw new Error('Wallet not available');

    setLoading(true);
    try {
      const userPubkey = new PublicKey(privyWallet?.publicKey);
      const [subscriptionPDA] = await subscriptionService.findSubscriptionStatePDA(
        userPubkey,
        merchantPubkey,
        subscriptionService.usdcMint
      );

      console.log('🔍 Checking if subscription exists:', subscriptionPDA.toString());

      // Try to fetch existing subscription
      const existingSubscription = await subscriptionService.getSubscriptionState(subscriptionPDA);

      if (existingSubscription) {
        if (existingSubscription.isActive) {
          // Subscription already exists and is active - return PDA for navigation
          const error: any = new Error('SUBSCRIPTION_ALREADY_EXISTS');
          error.subscriptionPDA = subscriptionPDA.toString();
          error.existingSubscription = existingSubscription;
          throw error;
        } else {
          // Subscription exists but is cancelled
          const error: any = new Error('SUBSCRIPTION_WAS_CANCELLED');
          error.subscriptionPDA = subscriptionPDA.toString();
          throw error;
        }
      }

      // No existing subscription found, proceed with creation
      console.log('✅ No existing subscription found, proceeding...');
      const signature = await UnifiedWalletService.subscribe(
        wallet,
        merchantPubkey,
        planId
      );
      await refreshBalance();
      return signature;
    } catch (error: any) {
      console.error('❌ Subscribe error:', error);
      
      // Re-throw with more context
      if (error.message === 'SUBSCRIPTION_ALREADY_EXISTS') {
        const enhancedError: any = new Error('You already have an active subscription to this merchant. You must cancel your existing subscription before subscribing to a different plan.');
        enhancedError.subscriptionPDA = error.subscriptionPDA;
        enhancedError.existingSubscription = error.existingSubscription;
        throw enhancedError;
      } else if (error.message === 'SUBSCRIPTION_WAS_CANCELLED') {
        const enhancedError: any = new Error('You previously cancelled a subscription to this merchant. Please contact support to reactivate or create a new subscription.');
        enhancedError.subscriptionPDA = error.subscriptionPDA;
        throw enhancedError;
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (privyWallet?.publicKey) {
      refreshBalance();
    }
  }, [privyWallet?.publicKey]);

  return {
    publicKey: privyWallet?.publicKey,
    balance,
    loading,
    walletCreating,
    deposit,
    withdraw,
    subscribe,
    refreshBalance,
    ensureWalletExists
  };
}