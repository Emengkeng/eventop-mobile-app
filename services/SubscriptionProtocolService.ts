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

const PROGRAM_ID = new PublicKey('BfvARc8RoHQ64quvHh2X6mSDMwFzxrzWM8HDCmdfbnKt');

const USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

export interface SubscriptionWalletData {
  owner: PublicKey;
  mainTokenAccount: PublicKey;
  mint: PublicKey;
  yieldVault: PublicKey;
  yieldStrategy: number;
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
  bump: number;
}

export class SubscriptionProtocolService {
  private connection: Connection;
  private programId: PublicKey;
  private usdcMint: PublicKey;

  constructor(
    rpcUrl: string = APP_CONFIG.RPC_URL || 'https://api.devnet.solana.com',
    programId: string = PROGRAM_ID.toString(),
    usdcMint: string = USDC_MINT.toString()
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    this.usdcMint = new PublicKey(usdcMint);
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

  // ============================================
  // TRANSACTION BUILDERS
  // ============================================

  /**
   * Create Subscription Wallet transaction
   */
  async createSubscriptionWallet(
    userPublicKey: PublicKey
  ): Promise<Transaction> {
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
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    const instructionData = Buffer.from([
      // Instruction discriminator for create_subscription_wallet
      // This would typically come from your IDL
      185, 3, 90, 137, 83, 170, 138, 84,
    ]);

    const keys = [
      { pubkey: subscriptionWalletPDA, isSigner: false, isWritable: true },
      { pubkey: mainTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: this.usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    transaction.add({
      keys,
      programId: this.programId,
      data: instructionData,
    });

    return transaction;
  }

  /**
   * Deposit to Subscription Wallet transaction
   */
  async depositToWallet(
    userPublicKey: PublicKey,
    amount: number // Amount in USDC (e.g., 100.5)
  ): Promise<Transaction> {
    const [subscriptionWalletPDA] = await this.findSubscriptionWalletPDA(
      userPublicKey,
      this.usdcMint
    );

    // User's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      userPublicKey
    );

    // Wallet's token account
    const walletTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      subscriptionWalletPDA,
      true
    );

    // Check if wallet token account exists, if not, create it
    const walletAccountInfo = await this.connection.getAccountInfo(walletTokenAccount);
    
    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    // Create wallet token account if it doesn't exist
    if (!walletAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPublicKey,
          walletTokenAccount,
          subscriptionWalletPDA,
          this.usdcMint
        )
      );
    }

    // Convert USDC to smallest unit (6 decimals)
    const amountInSmallestUnit = Math.floor(amount * 1_000_000);
    const amountBN = new BN(amountInSmallestUnit);

    // Build deposit instruction
    const instructionData = Buffer.concat([
      Buffer.from([157, 233, 124, 218, 166, 55, 95, 152]), // deposit_to_wallet discriminator
      amountBN.toArrayLike(Buffer, 'le', 8),
    ]);

    const keys = [
      { pubkey: subscriptionWalletPDA, isSigner: false, isWritable: false },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: walletTokenAccount, isSigner: false, isWritable: true },
      { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // yield_vault_account (placeholder)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    transaction.add({
      keys,
      programId: this.programId,
      data: instructionData,
    });

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

    const instructionData = Buffer.concat([
      Buffer.from([46, 137, 235, 47, 99, 179, 44, 121]), // withdraw_from_wallet discriminator
      amountBN.toArrayLike(Buffer, 'le', 8),
    ]);

    const keys = [
      { pubkey: subscriptionWalletPDA, isSigner: false, isWritable: false },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: walletTokenAccount, isSigner: false, isWritable: true },
      { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // yield_vault_account
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    transaction.add({
      keys,
      programId: this.programId,
      data: instructionData,
    });

    return transaction;
  }

  /**
   * Subscribe with Wallet transaction
   */
  async subscribeWithWallet(
    userPublicKey: PublicKey,
    merchantPublicKey: PublicKey,
    planId: string
  ): Promise<Transaction> {
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

    const instructionData = Buffer.from([
      95, 50, 168, 229, 104, 224, 175, 26 // subscribe_with_wallet discriminator
    ]);

    const keys = [
      { pubkey: subscriptionStatePDA, isSigner: false, isWritable: true },
      { pubkey: subscriptionWalletPDA, isSigner: false, isWritable: true },
      { pubkey: merchantPlanPDA, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: walletTokenAccount, isSigner: false, isWritable: false },
      { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // wallet_yield_vault
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    transaction.add({
      keys,
      programId: this.programId,
      data: instructionData,
    });

    return transaction;
  }

  /**
   * Execute payment from wallet transaction
   */
  async executePayment(
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

    // Get subscription data to find merchant plan
    const subscriptionData = await this.getSubscriptionState(subscriptionStatePDA);
    if (!subscriptionData) {
      throw new Error('Subscription not found');
    }

    const walletTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      subscriptionWalletPDA,
      true
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      merchantPublicKey
    );

    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;

    const instructionData = Buffer.from([
      239, 94, 227, 206, 106, 48, 47, 82 // execute_payment_from_wallet discriminator
    ]);

    const keys = [
      { pubkey: subscriptionStatePDA, isSigner: false, isWritable: true },
      { pubkey: subscriptionWalletPDA, isSigner: false, isWritable: true },
      { pubkey: subscriptionData.merchantPlan, isSigner: false, isWritable: false },
      { pubkey: walletTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    transaction.add({
      keys,
      programId: this.programId,
      data: instructionData,
    });

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

    const instructionData = Buffer.from([
      155, 138, 95, 80, 147, 120, 198, 227 // cancel_subscription_wallet discriminator
    ]);

    const keys = [
      { pubkey: subscriptionStatePDA, isSigner: false, isWritable: true },
      { pubkey: subscriptionWalletPDA, isSigner: false, isWritable: true },
      { pubkey: subscriptionData.merchantPlan, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
    ];

    transaction.add({
      keys,
      programId: this.programId,
      data: instructionData,
    });

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
      const accountInfo = await this.connection.getAccountInfo(walletPDA);
      if (!accountInfo) return null;

      // Parse account data (you'd use Anchor's IDL decoder in production)
      // This is a simplified version
      return this.parseSubscriptionWalletData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching subscription wallet:', error);
      return null;
    }
  }

  /**
   * Get Subscription State data
   */
  async getSubscriptionState(
    statePDA: PublicKey
  ): Promise<SubscriptionStateData | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(statePDA);
      if (!accountInfo) return null;

      return this.parseSubscriptionStateData(accountInfo.data);
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
      const accountInfo = await this.connection.getAccountInfo(planPDA);
      if (!accountInfo) return null;

      return this.parseMerchantPlanData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching merchant plan:', error);
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
      // This would typically use getProgramAccounts with filters
      // For now, return empty array - implement based on your needs
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: userPublicKey.toBase58(),
            },
          },
        ],
      });

      return accounts
        .map((account) => this.parseSubscriptionStateData(account.account.data))
        .filter((data): data is SubscriptionStateData => data !== null);
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return [];
    }
  }

  // ============================================
  // HELPER PARSERS (Simplified - use Anchor IDL in production)
  // ============================================

  private parseSubscriptionWalletData(data: Buffer): SubscriptionWalletData | null {
    // Implement proper deserialization based on your account structure
    // This is a placeholder
    return null;
  }

  private parseSubscriptionStateData(data: Buffer): SubscriptionStateData | null {
    // Implement proper deserialization
    return null;
  }

  private parseMerchantPlanData(data: Buffer): MerchantPlanData | null {
    // Implement proper deserialization
    return null;
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