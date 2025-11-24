// import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
// import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

// // USDC Mint Address (Mainnet)
// const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// export class SolanaService {
//   private connection: Connection;
//   private wallet: any = null;
//   private publicKey: string | null = null;

//   constructor(rpcUrl: string = 'https://api.devnet.solana.com') {
//     this.connection = new Connection(rpcUrl, 'confirmed');
//   }

//   /**
//    * Connect to Privy embedded wallet
//    */
//   async connectWallet(): Promise<{ publicKey: string }> {
//     try {
//       // This should be called with the Privy wallet instance
//       // You'll need to pass the wallet from usePrivy hook
//       if (!this.wallet) {
//         throw new Error('Wallet not initialized. Call setWallet first.');
//       }

//       const address = await this.wallet.address;
//       this.publicKey = address;

//       return { publicKey: address };
//     } catch (error) {
//       throw new Error(`Failed to connect wallet: ${error}`);
//     }
//   }

//   /**
//    * Set the wallet instance (should be called from component with Privy wallet)
//    */
//   setWallet(wallet: any) {
//     this.wallet = wallet;
//   }

//   /**
//    * Disconnect wallet
//    */
//   disconnect() {
//     this.wallet = null;
//     this.publicKey = null;
//   }

//   /**
//    * Get wallet public key
//    */
//   getPublicKey(): string | null {
//     return this.publicKey;
//   }

//   /**
//    * Create USDC transfer transaction
//    */
//   async createUSDCTransferTransaction(
//     fromAddress: string,
//     toAddress: string,
//     amountUSDC: number // Amount in USDC (e.g., 10.50)
//   ): Promise<Transaction> {
//     try {
//       const fromPubkey = new PublicKey(fromAddress);
//       const toPubkey = new PublicKey(toAddress);

//       // USDC has 6 decimals
//       const amountInSmallestUnit = Math.floor(amountUSDC * 1_000_000);

//       // Get associated token accounts
//       const fromTokenAccount = await getAssociatedTokenAddress(
//         USDC_MINT,
//         fromPubkey
//       );

//       const toTokenAccount = await getAssociatedTokenAddress(
//         USDC_MINT,
//         toPubkey
//       );

//       // Check if destination token account exists
//       const toAccountInfo = await this.connection.getAccountInfo(toTokenAccount);
      
//       const transaction = new Transaction();
//       const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
      
//       transaction.recentBlockhash = blockhash;
//       transaction.lastValidBlockHeight = lastValidBlockHeight;
//       transaction.feePayer = fromPubkey;

//       // If destination token account doesn't exist, create it first
//       if (!toAccountInfo) {
//         const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
//         transaction.add(
//           createAssociatedTokenAccountInstruction(
//             fromPubkey, // payer
//             toTokenAccount, // associated token account
//             toPubkey, // owner
//             USDC_MINT // mint
//           )
//         );
//       }

//       // Add transfer instruction
//       transaction.add(
//         createTransferInstruction(
//           fromTokenAccount,
//           toTokenAccount,
//           fromPubkey,
//           amountInSmallestUnit,
//           [],
//           TOKEN_PROGRAM_ID
//         )
//       );

//       return transaction;
//     } catch (error) {
//       throw new Error(`Failed to create USDC transfer transaction: ${error}`);
//     }
//   }

//   /**
//    * Create SOL transfer transaction
//    */
//   async createSOLTransferTransaction(
//     fromAddress: string,
//     toAddress: string,
//     amountSOL: number
//   ): Promise<Transaction> {
//     const transaction = new Transaction();
//     const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
//     const lamports = Math.floor(amountSOL * 1_000_000_000); // SOL to lamports
    
//     transaction.recentBlockhash = blockhash;
//     transaction.lastValidBlockHeight = lastValidBlockHeight;
//     transaction.feePayer = new PublicKey(fromAddress);
//     transaction.add(
//       SystemProgram.transfer({
//         fromPubkey: new PublicKey(fromAddress),
//         toPubkey: new PublicKey(toAddress),
//         lamports,
//       })
//     );

//     return transaction;
//   }

//   /**
//    * Sign and send transaction using Privy wallet
//    */
//   async signAndSendTransaction(transaction: Transaction): Promise<string> {
//     try {
//       if (!this.wallet) {
//         throw new Error('Wallet not connected');
//       }

//       // Serialize transaction
//       const serializedTx = transaction.serialize({
//         requireAllSignatures: false,
//         verifySignatures: false,
//       });

//       // Sign with Privy wallet
//       const signedTx = await this.wallet.signTransaction(serializedTx);

//       // Send transaction
//       const signature = await this.connection.sendRawTransaction(signedTx, {
//         skipPreflight: false,
//         preflightCommitment: 'confirmed',
//       });

//       // Confirm transaction
//       await this.connection.confirmTransaction(signature, 'confirmed');

//       return signature;
//     } catch (error) {
//       throw new Error(`Failed to sign and send transaction: ${error}`);
//     }
//   }

//   /**
//    * Get USDC balance for an address
//    */
//   async getUSDCBalance(address: string): Promise<number> {
//     try {
//       const pubkey = new PublicKey(address);
//       const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, pubkey);
      
//       const balance = await this.connection.getTokenAccountBalance(tokenAccount);
//       return parseFloat(balance.value.uiAmount?.toString() || '0');
//     } catch (error) {
//       return 0; // Return 0 if account doesn't exist
//     }
//   }

//   /**
//    * Get SOL balance for an address
//    */
//   async getSOLBalance(address: string): Promise<number> {
//     try {
//       const pubkey = new PublicKey(address);
//       const balance = await this.connection.getBalance(pubkey);
//       return balance / 1_000_000_000; // Convert lamports to SOL
//     } catch (error) {
//       return 0;
//     }
//   }

//   /**
//    * Get transaction explorer URL
//    */
//   getExplorerUrl(signature: string, network: 'mainnet' | 'devnet' = 'devnet'): string {
//     const cluster = network === 'devnet' ? '?cluster=devnet' : '';
//     return `https://explorer.solana.com/tx/${signature}${cluster}`;
//   }

//   /**
//    * Get address explorer URL
//    */
//   getAddressExplorerUrl(address: string, network: 'mainnet' | 'devnet' = 'devnet'): string {
//     const cluster = network === 'devnet' ? '?cluster=devnet' : '';
//     return `https://explorer.solana.com/address/${address}${cluster}`;
//   }
// }

// export const solanaService = new SolanaService();