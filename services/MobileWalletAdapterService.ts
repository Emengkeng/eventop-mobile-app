// import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
// import { PublicKey, Transaction } from '@solana/web3.js';

// export const APP_IDENTITY = {
//   name: 'Subscription Protocol',
//   uri: 'https://eventop.xyz',
//   icon: 'favicon.ico',
// };

// export interface AuthorizationResult {
//   address: string;
//   authToken: string;
//   publicKey: PublicKey;
// }

// export class MobileWalletAdapterService {
//   /**
//    * Authorize/Connect to wallet
//    */
//   static async authorize(
//     previousAuthToken?: string
//   ): Promise<AuthorizationResult> {
//     return await transact(async (wallet: Web3MobileWallet) => {
//       const authResult = await wallet.authorize({
//         cluster: 'devnet',
//         identity: APP_IDENTITY,
//         // auth_token: previousAuthToken,
//       });

//       const firstAccount = authResult.accounts[0];
      
//       return {
//         address: firstAccount.address,
//         authToken: authResult.auth_token,
//         publicKey: new PublicKey(firstAccount.address),
//       };
//     });
//   }

//   /**
//    * Deauthorize/Disconnect from wallet
//    */
//   static async deauthorize(authToken: string): Promise<void> {
//     await transact(async (wallet: Web3MobileWallet) => {
//       await wallet.deauthorize({ auth_token: authToken });
//     });
//   }

//   /**
//    * Sign and send a transaction
//    */
//   static async signAndSendTransaction(
//     transaction: Transaction,
//     authToken?: string
//   ): Promise<string> {
//     return await transact(async (wallet: Web3MobileWallet) => {
//       // Re-authorize if needed
//       const authResult = await wallet.authorize({
//         cluster: 'devnet',
//         identity: APP_IDENTITY,
//         // auth_token: authToken,
//       });

//       // Sign and send the transaction
//       const signatures = await wallet.signAndSendTransactions({
//         transactions: [transaction],
//       });

//       return signatures[0]; // Transaction signature
//     });
//   }

//   /**
//    * Sign a transaction (without sending)
//    */
//   static async signTransaction(
//     transaction: Transaction,
//     authToken?: string
//   ): Promise<Transaction> {
//     return await transact(async (wallet: Web3MobileWallet) => {
//       // Re-authorize if needed
//       await wallet.authorize({
//         cluster: 'devnet',
//         identity: APP_IDENTITY,
//         // auth_token: authToken,
//       });

//       // Sign the transaction
//       const signedTxs = await wallet.signTransactions({
//         transactions: [transaction],
//       });

//       return signedTxs[0];
//     });
//   }

//   /**
//    * Sign a message
//    */
//   static async signMessage(
//     message: Uint8Array,
//     address: string,
//     authToken?: string
//   ): Promise<Uint8Array> {
//     return await transact(async (wallet: Web3MobileWallet) => {
//       // Re-authorize if needed
//       await wallet.authorize({
//         cluster: 'devnet',
//         identity: APP_IDENTITY,
//        // auth_token: authToken,
//       });

//       // Sign the message
//       const signedMessages = await wallet.signMessages({
//         addresses: [address],
//         payloads: [message],
//       });

//       return signedMessages[0];
//     });
//   }
// }