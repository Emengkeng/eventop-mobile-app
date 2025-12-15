import { PublicKey } from '@solana/web3.js';
import { subscriptionService } from './SubscriptionProtocolService';
import { useEmbeddedSolanaWallet } from "@privy-io/expo";

/**
 * Unified wallet service that abstracts away the complexity of having
 * both a Privy embedded wallet and a subscription wallet PDA
 */
export class UnifiedWalletService {
  /**
   * Get or create the subscription wallet for a user
   * This is called automatically when needed, transparent to the user
   */
  static async ensureSubscriptionWallet(
    privyWallet: any
  ): Promise<{ subscriptionWalletPDA: PublicKey; needsCreation: boolean }> {
    if (!privyWallet?.publicKey) {
      throw new Error('Privy wallet not initialized');
    }

    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    // Derive the subscription wallet PDA
    const [subscriptionWalletPDA] = await subscriptionService.findSubscriptionWalletPDA(
      userPubkey
    );

    // Check if it exists on-chain
    const exists = await subscriptionService.subscriptionWalletExists(subscriptionWalletPDA);
    
    return {
      subscriptionWalletPDA,
      needsCreation: !exists
    };
  }

  /**
   * Auto-create subscription wallet if needed before any subscription operation
   */
  static async prepareForSubscriptionOperation(
    privyWallet: any
    ): Promise<PublicKey> {
    if (!privyWallet?.publicKey) {
        throw new Error('Privy wallet not initialized');
    }

    const userPubkey = new PublicKey(privyWallet.publicKey);
    const [subscriptionWalletPDA] = await subscriptionService.findSubscriptionWalletPDA(userPubkey);

    // if (subscriptionWalletPDA.toBase58() == "B5DDP1qKBRxgZpNAshBd3oTj8M6qiP9n2UYu3Q3v6sfy") {
    //     throw new Error('Subscription wallet PDA mismatch');
    // }

    // Fresh check right before creation attempt
    const accountInfo = await subscriptionService.connection.getAccountInfo(subscriptionWalletPDA);
    
    if (!accountInfo || !accountInfo.owner.equals(subscriptionService['programId'])) {
        // Definitely needs creation
        try {
        const createSig = await this.createSubscriptionWallet(privyWallet);
        await subscriptionService.connection.confirmTransaction(createSig, 'confirmed');
        console.log('✅ Subscription wallet created:', createSig);
        } catch (error: any) {
        // Double-check if another transaction created it concurrently
        const recheckInfo = await subscriptionService.connection.getAccountInfo(subscriptionWalletPDA);
        if (!recheckInfo || !recheckInfo.owner.equals(subscriptionService['programId'])) {
            throw error; // Actually failed
        }
        console.log('⚠️ Wallet created by concurrent transaction');
        }
    } else {
        console.log('✅ Subscription wallet already exists');
    }

    return subscriptionWalletPDA;
  }

  /**
   * Create subscription wallet using Privy's embedded wallet
   */
  static async createSubscriptionWallet(privyWallet: any): Promise<string> {
    const provider = await privyWallet.getProvider();
    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    // Build the transaction
    const transaction = await subscriptionService.createSubscriptionWallet(userPubkey);

    // Sign and send using Privy's provider
    const { signature } = await provider.request({
      method: "signAndSendTransaction",
      params: {
        transaction,
        connection: subscriptionService.connection,
      },
    });

    return signature;
  }

  /**
   * Get unified balance display (combines both wallets)
   */
  static async getUnifiedBalance(privyWallet: any): Promise<{
    total: number;
    available: number;
    committed: number;
  }> {
    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    // Get subscription wallet balance
    const subscriptionBalance = await subscriptionService.getWalletBalance(userPubkey);
    
    // Get committed amount (sum of active subscriptions)
    const subscriptions = await subscriptionService.getUserSubscriptions(userPubkey);
    const committed = subscriptions
      .filter(sub => sub.isActive)
      .reduce((sum, sub) => {
        // 3 months buffer per subscription
        const monthlyFee = parseFloat(sub.feeAmount.toString()) / 1_000_000;
        return sum + (monthlyFee * 3);
      }, 0);

    return {
      total: subscriptionBalance,
      available: Math.max(0, subscriptionBalance - committed),
      committed
    };
  }

  /**
   * Withdraw from subscription wallet
   */
  static async withdraw(
    privyWallet: any,
    amount: number
  ): Promise<string> {
    const provider = await privyWallet.getProvider();
    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    const transaction = await subscriptionService.withdrawFromWallet(
      userPubkey,
      amount
    );

    const { signature } = await provider.request({
      method: "signAndSendTransaction",
      params: {
        transaction,
        connection: subscriptionService.connection,
      },
    });

    return signature;
  }

  /**
   * Deposit to subscription wallet
   * Automatically creates wallet if needed
   */
  static async deposit(
    privyWallet: any,
    amount: number
  ): Promise<string> {
    // Ensure subscription wallet exists
    await this.prepareForSubscriptionOperation(privyWallet);

    const provider = await privyWallet.getProvider();
    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    const transaction = await subscriptionService.depositToWallet(
      userPubkey,
      amount
    );

    const { signature } = await provider.request({
      method: "signAndSendTransaction",
      params: {
        transaction,
        connection: subscriptionService.connection,
      },
    });

    return signature;
  }

  /**
   * Subscribe to a plan
   * Automatically creates wallet if needed
   */
  static async subscribe(
    privyWallet: any,
    merchantPublicKey: PublicKey,
    planId: string,
    sessionToken: string
  ): Promise<string> {
    if (!sessionToken || sessionToken.trim() === '') {
      throw new Error('Session token is required for subscription');
    }
    // Ensure subscription wallet exists
    await this.prepareForSubscriptionOperation(privyWallet);

    const provider = await privyWallet.getProvider();
    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    const transaction = await subscriptionService.subscribeWithWallet(
      userPubkey,
      merchantPublicKey,
      planId,
      sessionToken
    );

    const { signature } = await provider.request({
      method: "signAndSendTransaction",
      params: {
        transaction,
        connection: subscriptionService.connection,
      },
    });

    return signature;
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    privyWallet: any,
    merchantPublicKey: PublicKey
  ): Promise<string> {
    if (!privyWallet?.publicKey) {
      throw new Error('Privy wallet not initialized');
    }

    const provider = await privyWallet.getProvider();
    const userPubkey = new PublicKey(privyWallet.publicKey);
    
    // Build the cancel transaction
    const transaction = await subscriptionService.cancelSubscription(
      userPubkey,
      merchantPublicKey
    );

    // Sign and send using Privy's provider
    const { signature } = await provider.request({
      method: "signAndSendTransaction",
      params: {
        transaction,
        connection: subscriptionService.connection,
      },
    });

    // Wait for confirmation
    await subscriptionService.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }
}
