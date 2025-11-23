import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

export class SolanaWalletService {
  private connection: Connection;

  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl);
  }

  async signMessage(wallet: any, message: string) {
    try {
      const provider = await wallet.getProvider?.();
      if (!provider) throw new Error('Provider not available');

      const { signature } = await provider.request({
        method: 'signMessage',
        params: { message },
      });

      return signature;
    } catch (error) {
      throw new Error(`Failed to sign message: ${error}`);
    }
  }

  async signTransaction(wallet: any, transaction: Transaction) {
    try {
      const provider = await wallet.getProvider?.();
      if (!provider) throw new Error('Provider not available');

      const { signedTransaction } = await provider.request({
        method: 'signTransaction',
        params: { transaction },
      });

      return signedTransaction;
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  async signAndSendTransaction(wallet: any, transaction: Transaction) {
    try {
      const provider = await wallet.getProvider?.();
      if (!provider) throw new Error('Provider not available');

      const { signature } = await provider.request({
        method: 'signAndSendTransaction',
        params: {
          transaction,
          connection: this.connection,
        },
      });

      return signature;
    } catch (error) {
      throw new Error(`Failed to sign and send transaction: ${error}`);
    }
  }

  async createTransferTransaction(
    fromAddress: string,
    toAddress: string,
    lamports: number
  ): Promise<Transaction> {
    const transaction = new Transaction();
    const { blockhash } = await this.connection.getLatestBlockhash('finalized');
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(fromAddress);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromAddress),
        toPubkey: new PublicKey(toAddress),
        lamports,
      })
    );

    return transaction;
  }
}

export const solanaWalletService = new SolanaWalletService();