import { UnifiedWalletService } from "@/services/UnifiedWalletService";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";
import React from "react";

export function useUnifiedWallet() {
  const { wallets } = useEmbeddedSolanaWallet();
  const privyWallet = wallets?.[0];

  const [balance, setBalance] = React.useState({
    total: 0,
    available: 0,
    committed: 0
  });
  const [loading, setLoading] = React.useState(false);

  const refreshBalance = async () => {
    if (!privyWallet?.publicKey) return;
    
    setLoading(true);
    try {
      const bal = await UnifiedWalletService.getUnifiedBalance(privyWallet);
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (amount: number) => {
    if (!privyWallet) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const signature = await UnifiedWalletService.deposit(privyWallet, amount);
      await refreshBalance();
      return signature;
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (amount: number) => {
    if (!privyWallet) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const signature = await UnifiedWalletService.withdraw(privyWallet, amount);
      await refreshBalance();
      return signature;
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (merchantPubkey: PublicKey, planId: string) => {
    if (!privyWallet) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const signature = await UnifiedWalletService.subscribe(
        privyWallet,
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
    refreshBalance();
  }, [privyWallet?.publicKey]);

  return {
    publicKey: privyWallet?.publicKey,
    balance,
    loading,
    deposit,
    withdraw,
    subscribe,
    refreshBalance
  };
}