import { UnifiedWalletService } from "@/services/UnifiedWalletService";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";
import React from "react";

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
      // Avoid multiple simultaneous wallet creation attempts
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
    if (!wallet) throw new Error('Wallet not available');

    setLoading(true);
    try {
      const signature = await UnifiedWalletService.subscribe(
        wallet,
        merchantPubkey,
        planId
      );
      await refreshBalance();
      return signature;
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