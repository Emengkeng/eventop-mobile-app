import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { BN, Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { APP_CONFIG } from '@/config/app';
import localidl from '../idl/subscription_protocol.json';
import type { SubscriptionProtocol } from '../types/subscription_protocol';
import { ACCOUNT_DISCRIMINATORS } from '@/types';
import bs58 from 'bs58';

const PROGRAM_ID = new PublicKey('GPVtSfXPiy8y4SkJrMC3VFyKUmGVhMrRbAp2NhiW1Ds2');

export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export interface SubscriptionWalletData {
  owner: PublicKey;
  mainTokenAccount: PublicKey;
  mint: PublicKey;
  yieldVault: PublicKey;
  yieldStrategy: { none: {} } | { marginfiLend: {} } | { kaminoLend: {} } | { solendPool: {} } | { driftDeposit: {} };
  isYieldEnabled: boolean;
  totalSubscriptions: number;
  totalSpent: BN;
  bump: number;
}

export interface MerchantPlanData {
  merchant: PublicKey;
  mint: PublicKey;
  planId: string;
  planName: string;
  feeAmount: BN;
  paymentInterval: BN;
  isActive: boolean;
  totalSubscribers: number;
  bump: number;
}

export interface SubscriptionStateData {
  user: PublicKey;
  subscriptionWallet: PublicKey;
  merchant: PublicKey;
  mint: PublicKey;
  merchantPlan: PublicKey;
  feeAmount: BN;
  paymentInterval: BN;
  lastPaymentTimestamp: BN;
  totalPaid: BN;
  paymentCount: number;
  isActive: boolean;
  sessionToken: string;
  bump: number;
}

export class SubscriptionProtocolService {
  public connection: Connection;
  private programId: PublicKey;
  public usdcMint: PublicKey;
  private program: Program<SubscriptionProtocol>;

  constructor(
    rpcUrl: string = APP_CONFIG.RPC_URL || 'https://api.devnet.solana.com',
    programId: string = PROGRAM_ID.toString(),
    usdcMint: string = USDC_MINT.toString()
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    this.usdcMint = new PublicKey(usdcMint);

    // Create a dummy provider for the program (we'll use manual transaction building)
    const dummyProvider = {
      connection: this.connection,
      publicKey: PublicKey.default,
    } as any;

    this.program = new Program<SubscriptionProtocol>(
      localidl as SubscriptionProtocol,
      dummyProvider
    );
  }

  // ============================================
  // PDA DERIVATION HELPERS
  // ============================================

  /**
   * Derive Subscription Wallet PDA
   */
  async findSubscriptionWalletPDA(
    owner: PublicKey,
    mint: PublicKey = this.usdcMint
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('subscription_wallet'),
        owner.toBuffer(),
        mint.toBuffer(),
      ],
      this.programId
    );
  }

  /**
   * Derive Merchant Plan PDA
   */
  async findMerchantPlanPDA(
    merchant: PublicKey,
    planId: string,
    mint: PublicKey = this.usdcMint
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('merchant_plan'),
        merchant.toBuffer(),
        mint.toBuffer(),
        Buffer.from(planId),
      ],
      this.programId
    );
  }

  /**
   * Derive Subscription State PDA
   */
  async findSubscriptionStatePDA(
    user: PublicKey,
    merchant: PublicKey,
    mint: PublicKey = this.usdcMint
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('subscription'),
        user.toBuffer(),
        merchant.toBuffer(),
        mint.toBuffer(),
      ],
      this.programId
    );
  }

  /**
   * Derive Session Token Tracker PDA
   */
  async findSessionTokenTrackerPDA(
    sessionToken: string
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('session_token'),
        Buffer.from(sessionToken),
      ],
      this.programId
    );
  }

  /**
   * Derive Protocol Config PDA
   */
  async findProtocolConfigPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('protocol_config')],
      this.programId
    );
  }

  // ============================================
  // TRANSACTION BUILDERS
  // ============================================

  /**
   * Create Subscription Wallet transaction
   */
  async createSubscriptionWallet(
    userPublicKey: PublicKey
  ): Promise<Transaction> {
    console.log('Creating subscription wallet...');
    const [subscriptionWalletPDA] = await this.findSubscriptionWalletPDA(
      userPublicKey,
      this.usdcMint
    );

    // Get associated token account for the subscription wallet
    const mainTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      subscriptionWalletPDA,
      true // allowOwnerOffCurve
    );

    const transaction = new Transaction();
    const { blockhash } = 
      await this.connection.getLatestBlockhash('confirmed');
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Check if ATA exists, create if needed
    const ataInfo = await this.connection.getAccountInfo(mainTokenAccount);
    if (!ataInfo) {
      console.log('Creating ATA for subscription wallet...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPublicKey,        // payer
          mainTokenAccount,     // ata
          subscriptionWalletPDA, // owner (the PDA)
          this.usdcMint,        // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    } else {
      console.log('ATA already exists for subscription wallet');
    }

    // Use Anchor's instruction builder
    const ix = await this.program.methods
      .createSubscriptionWallet()
      .accounts({
        // subscriptionWallet: subscriptionWalletPDA,
        mainTokenAccount: mainTokenAccount,
        user: userPublicKey,
        mint: this.usdcMint,
       // tokenProgram: TOKEN_PROGRAM_ID,
       // systemProgram: SystemProgram.programId,
       // rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    transaction.add(ix);

    return transaction;
  }

  /**
   * Deposit to Subscription Wallet transaction
   */
  async depositToWallet(
    userPublicKey: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const [subscriptionWalletPDA] = await this.findSubscriptionWalletPDA(
      userPublicKey,
      this.usdcMint
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      userPublicKey
    );

    const walletTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      subscriptionWalletPDA,
      true
    );

    const transaction = new Transaction();
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    const amountInSmallestUnit = Math.floor(amount * 1_000_000);
    const amountBN = new BN(amountInSmallestUnit);

    const ix = await this.program.methods
      .depositToWallet(amountBN)
      .accounts({
        // subscriptionWallet: subscriptionWalletPDA,
        user: userPublicKey,
        userTokenAccount: userTokenAccount,
        walletTokenAccount: walletTokenAccount,
        yieldVaultAccount: PublicKey.default,
        // tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    transaction.add(ix);

    return transaction;
  }

  /**
   * Withdraw from Subscription Wallet transaction
   */
  async withdrawFromWallet(
    userPublicKey: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const [subscriptionWalletPDA] = await this.findSubscriptionWalletPDA(
      userPublicKey,
      this.usdcMint
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      userPublicKey
    );

    const walletTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      subscriptionWalletPDA,
      true
    );

    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    const amountInSmallestUnit = Math.floor(amount * 1_000_000);
    const amountBN = new BN(amountInSmallestUnit);

    const ix = await this.program.methods
      .withdrawFromWallet(amountBN)
      .accounts({
        // subscriptionWallet: subscriptionWalletPDA,
        // owner: userPublicKey,
        userTokenAccount: userTokenAccount,
        walletTokenAccount: walletTokenAccount,
        yieldVaultAccount: PublicKey.default,
        // tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    transaction.add(ix);

    return transaction;
  }

  /**
   * Subscribe with Wallet transaction
   */
  async subscribeWithWallet(
    userPublicKey: PublicKey,
    merchantPublicKey: PublicKey,
    planId: string,
    sessionToken: string
  ): Promise<Transaction> {
    if (!sessionToken || sessionToken.trim() === '') {
      throw new Error('Session token is required');
    }

    if (sessionToken.length > 64) {
      throw new Error('Session token exceeds maximum length (64 characters)');
    }

    const [subscriptionWalletPDA] = await this.findSubscriptionWalletPDA(
      userPublicKey,
      this.usdcMint
    );

    const [merchantPlanPDA] = await this.findMerchantPlanPDA(
      merchantPublicKey,
      planId,
      this.usdcMint
    );

    const [subscriptionStatePDA] = await this.findSubscriptionStatePDA(
      userPublicKey,
      merchantPublicKey,
      this.usdcMint
    );

    const [sessionTokenTrackerPDA] = await this.findSessionTokenTrackerPDA(
      sessionToken
    );

    const walletTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      subscriptionWalletPDA,
      true
    );

    const transaction = new Transaction();
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    const ix = await this.program.methods
      .subscribeWithWallet(sessionToken)
      .accountsPartial({
        subscriptionState: subscriptionStatePDA,
        sessionTokenTracker: sessionTokenTrackerPDA,
        subscriptionWallet: subscriptionWalletPDA,
        merchantPlan: merchantPlanPDA,
        user: userPublicKey,
        walletTokenAccount: walletTokenAccount,
        walletYieldVault: PublicKey.default,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    transaction.add(ix);

    return transaction;
  }

  /**
   * Cancel subscription transaction
   */
  async cancelSubscription(
    userPublicKey: PublicKey,
    merchantPublicKey: PublicKey
  ): Promise<Transaction> {
    const [subscriptionWalletPDA] = await this.findSubscriptionWalletPDA(
      userPublicKey,
      this.usdcMint
    );

    const [subscriptionStatePDA] = await this.findSubscriptionStatePDA(
      userPublicKey,
      merchantPublicKey,
      this.usdcMint
    );

    const subscriptionData = await this.getSubscriptionState(subscriptionStatePDA);
    if (!subscriptionData) {
      throw new Error('Subscription not found');
    }

    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    const ix = await this.program.methods
      .cancelSubscriptionWallet()
      .accounts({
       // subscriptionState: subscriptionStatePDA,
        subscriptionWallet: subscriptionWalletPDA,
        merchantPlan: subscriptionData.merchantPlan,
       // user: userPublicKey,
      })
      .instruction();

    transaction.add(ix);

    return transaction;
  }

  // ============================================
  // ACCOUNT DATA FETCHERS
  // ============================================

  /**
   * Get Subscription Wallet data
   */
  async getSubscriptionWallet(
    walletPDA: PublicKey
  ): Promise<SubscriptionWalletData | null> {
    try {
      const accountData = await this.program.account.subscriptionWallet.fetch(walletPDA);
      
      return {
        owner: accountData.owner,
        mainTokenAccount: accountData.mainTokenAccount,
        mint: accountData.mint,
        yieldVault: accountData.yieldVault,
        yieldStrategy: accountData.yieldStrategy,
        isYieldEnabled: accountData.isYieldEnabled,
        totalSubscriptions: accountData.totalSubscriptions,
        totalSpent: accountData.totalSpent,
        bump: accountData.bump,
      };
    } catch (error) {
      console.error('Error fetching subscription wallet:', error);
      return null;
    }
  }

  /**
   * Check if subscription wallet exists
   */
  async subscriptionWalletExists(userPublicKey: PublicKey): Promise<boolean> {
    try {
      const [walletPDA] = await this.findSubscriptionWalletPDA(userPublicKey);
      const accountInfo = await this.connection.getAccountInfo(walletPDA);
      
      // Check if account exists AND is owned by our program
      return accountInfo !== null && accountInfo.owner.equals(this.programId);
    } catch (error) {
      console.error('Error checking subscription wallet:', error);
      return false;
    }
  }

  /**
   * Get Subscription State data
   */
  async getSubscriptionState(
    statePDA: PublicKey
  ): Promise<SubscriptionStateData | null> {
    try {
      const accountData = await this.program.account.subscriptionState.fetch(statePDA);
      
      return {
        user: accountData.user,
        subscriptionWallet: accountData.subscriptionWallet,
        merchant: accountData.merchant,
        mint: accountData.mint,
        merchantPlan: accountData.merchantPlan,
        feeAmount: accountData.feeAmount,
        paymentInterval: accountData.paymentInterval,
        lastPaymentTimestamp: accountData.lastPaymentTimestamp,
        totalPaid: accountData.totalPaid,
        paymentCount: accountData.paymentCount,
        isActive: accountData.isActive,
        sessionToken: accountData.sessionToken,
        bump: accountData.bump,
      };
    } catch (error) {
      console.error('Error fetching subscription state:', error);
      return null;
    }
  }

  /**
   * Get Merchant Plan data
   */
  async getMerchantPlan(
    planPDA: PublicKey
  ): Promise<MerchantPlanData | null> {
    try {
      const accountData = await this.program.account.merchantPlan.fetch(planPDA);
      
      return {
        merchant: accountData.merchant,
        mint: accountData.mint,
        planId: accountData.planId,
        planName: accountData.planName,
        feeAmount: accountData.feeAmount,
        paymentInterval: accountData.paymentInterval,
        isActive: accountData.isActive,
        totalSubscribers: accountData.totalSubscribers,
        bump: accountData.bump,
      };
    } catch (error) {
      console.error('Error fetching merchant plan:', error);
      return null;
    }
  }

  /**
   * Get Protocol Config data
   */
  async getProtocolConfig(): Promise<{
    authority: PublicKey;
    treasury: PublicKey;
    protocolFeeBps: number;
    bump: number;
  } | null> {
    try {
      const [protocolConfigPDA] = await this.findProtocolConfigPDA();
      const accountData = await this.program.account.protocolConfig.fetch(protocolConfigPDA);
      
      return {
        authority: accountData.authority,
        treasury: accountData.treasury,
        protocolFeeBps: accountData.protocolFeeBps,
        bump: accountData.bump,
      };
    } catch (error) {
      console.error('Error fetching protocol config:', error);
      return null;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userPublicKey: PublicKey): Promise<number> {
    try {
      const [walletPDA] = await this.findSubscriptionWalletPDA(
        userPublicKey,
        this.usdcMint
      );

      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        walletPDA,
        true
      );

      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(balance.value.uiAmount?.toString() || '0');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(
    userPublicKey: PublicKey
  ): Promise<SubscriptionStateData[]> {
    try {
      const accounts = await this.program.account.subscriptionState.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: bs58.encode(ACCOUNT_DISCRIMINATORS.SubscriptionState),
          },
        },
      ]);

      return accounts.map((account) => ({
        user: account.account.user,
        subscriptionWallet: account.account.subscriptionWallet,
        merchant: account.account.merchant,
        mint: account.account.mint,
        merchantPlan: account.account.merchantPlan,
        feeAmount: account.account.feeAmount,
        paymentInterval: account.account.paymentInterval,
        lastPaymentTimestamp: account.account.lastPaymentTimestamp,
        totalPaid: account.account.totalPaid,
        paymentCount: account.account.paymentCount,
        isActive: account.account.isActive,
        sessionToken: account.account.sessionToken,
        bump: account.account.bump,
      }));
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return [];
    }
  }

  /**
   * Get all merchant plans for a merchant
   */
  async getMerchantPlans(
    merchantPublicKey: PublicKey
  ): Promise<MerchantPlanData[]> {
    try {
      const accounts = await this.program.account.merchantPlan.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: bs58.encode(ACCOUNT_DISCRIMINATORS.MerchantPlan),
          },
        },
      ]);

      return accounts.map((account) => ({
        merchant: account.account.merchant,
        mint: account.account.mint,
        planId: account.account.planId,
        planName: account.account.planName,
        feeAmount: account.account.feeAmount,
        paymentInterval: account.account.paymentInterval,
        isActive: account.account.isActive,
        totalSubscribers: account.account.totalSubscribers,
        bump: account.account.bump,
      }));
    } catch (error) {
      console.error('Error fetching merchant plans:', error);
      return [];
    }
  }

  /**
   * Get Solana Explorer URL
   */
  getExplorerUrl(signature: string, type: 'tx' | 'address' = 'tx'): string {
    return `https://explorer.solana.com/${type}/${signature}?cluster=devnet`;
  }
}

let _subscriptionService: SubscriptionProtocolService | null = null;

export const getSubscriptionService = () => {
  if (!_subscriptionService) {
    _subscriptionService = new SubscriptionProtocolService();
  }
  return _subscriptionService;
};

export const subscriptionService = getSubscriptionService();