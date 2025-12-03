// import { useState, useEffect, useCallback } from 'react';
// import { PublicKey } from '@solana/web3.js';
// import { Alert } from 'react-native';
// import {
//   subscriptionService,
//   SubscriptionWalletData,
// } from '@/services/SubscriptionProtocolService';
// import { MobileWalletAdapterService } from '@/services/MobileWalletAdapterService';

// export function useSubscriptionWallet(
//   userPublicKey?: string,
//   authToken?: string
// ) {
//   const [walletPDA, setWalletPDA] = useState<string | null>(null);
//   const [walletData, setWalletData] = useState<SubscriptionWalletData | null>(null);
//   const [balance, setBalance] = useState<number>(0);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   // Derive and fetch wallet PDA
//   useEffect(() => {
//     if (userPublicKey) {
//       deriveWalletPDA();
//     }
//   }, [userPublicKey]);

//   const deriveWalletPDA = async () => {
//     if (!userPublicKey) return;

//     try {
//       const [pda] = await subscriptionService.findSubscriptionWalletPDA(
//         new PublicKey(userPublicKey)
//       );
      
//       const data = await subscriptionService.getSubscriptionWallet(pda);
      
//       if (data) {
//         setWalletPDA(pda.toString());
//         setWalletData(data);
        
//         const bal = await subscriptionService.getWalletBalance(
//           new PublicKey(userPublicKey)
//         );
//         setBalance(bal);
//       } else {
//         setWalletPDA(null);
//         setWalletData(null);
//         setBalance(0);
//       }
//     } catch (error) {
//       console.error('Error deriving wallet PDA:', error);
//       setWalletPDA(null);
//       setWalletData(null);
//       setBalance(0);
//     }
//   };

//   const fetchWalletData = async (pda?: string) => {
//     const targetPDA = pda || walletPDA;
//     if (!targetPDA) return;

//     try {
//       setRefreshing(true);
//       const data = await subscriptionService.getSubscriptionWallet(
//         new PublicKey(targetPDA)
//       );
      
//       if (data) {
//         setWalletData(data);

//         if (userPublicKey) {
//           const bal = await subscriptionService.getWalletBalance(
//             new PublicKey(userPublicKey)
//           );
//           setBalance(bal);
//         }
//       } else {
//         setWalletPDA(null);
//         setWalletData(null);
//         setBalance(0);
//       }
//     } catch (error) {
//       console.error('Error fetching wallet data:', error);
//     } finally {
//       setRefreshing(false);
//     }
//   };

//   const createWallet = async (): Promise<boolean> => {
//     if (!userPublicKey || !authToken) {
//       Alert.alert('Error', 'Wallet not connected');
//       return false;
//     }

//     setLoading(true);
//     try {
//       console.log('Building transaction...');
      
//       const transaction = await subscriptionService.createSubscriptionWallet(
//         new PublicKey(userPublicKey)
//       );

//       console.log('Transaction built:', {
//         feePayer: transaction.feePayer?.toString(),
//         recentBlockhash: transaction.recentBlockhash,
//         instructionCount: transaction.instructions.length,
//       });

//       console.log('Requesting signature from wallet...');
      
//       // Use MWA to sign and send
//       const signature = await MobileWalletAdapterService.signAndSendTransaction(
//         transaction,
//         authToken
//       );

//       console.log('Transaction signature:', signature);

//       Alert.alert('Success', 'Subscription wallet created successfully!');
      
//       // Wait for confirmation
//       await new Promise(resolve => setTimeout(resolve, 2000));
//       await deriveWalletPDA();
      
//       return true;
//     } catch (error: any) {
//       console.error('Error creating wallet:', error);
      
//       let errorMessage = 'Failed to create wallet';
      
//       if (error?.message?.includes('User declined')) {
//         errorMessage = 'You cancelled the transaction';
//       } else if (error?.message) {
//         errorMessage = error.message;
//       }
      
//       Alert.alert('Error', errorMessage);
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const deposit = async (amount: number): Promise<boolean> => {
//     if (!userPublicKey || !authToken) {
//       Alert.alert('Error', 'Wallet not connected');
//       return false;
//     }

//     setLoading(true);
//     try {
//       const transaction = await subscriptionService.depositToWallet(
//         new PublicKey(userPublicKey),
//         amount
//       );

//       const signature = await MobileWalletAdapterService.signAndSendTransaction(
//         transaction,
//         authToken
//       );

//       console.log('✅ Deposit signature:', signature);

//       Alert.alert('Success', `Deposited ${amount} USDC successfully!`);

//       await fetchWalletData();
//       return true;
//     } catch (error: any) {
//       console.error('Error depositing:', error);
//       Alert.alert('Error', error.message || 'Failed to deposit');
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const withdraw = async (amount: number): Promise<boolean> => {
//     if (!userPublicKey || !authToken) {
//       Alert.alert('Error', 'Wallet not connected');
//       return false;
//     }

//     setLoading(true);
//     try {
//       const transaction = await subscriptionService.withdrawFromWallet(
//         new PublicKey(userPublicKey),
//         amount
//       );

//       const signature = await MobileWalletAdapterService.signAndSendTransaction(
//         transaction,
//         authToken
//       );

//       console.log('✅ Withdrawal signature:', signature);

//       Alert.alert('Success', `Withdrew ${amount} USDC successfully!`);

//       await fetchWalletData();
//       return true;
//     } catch (error: any) {
//       console.error('Error withdrawing:', error);
//       Alert.alert('Error', error.message || 'Failed to withdraw');
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const refresh = useCallback(() => {
//     fetchWalletData();
//   }, [walletPDA]);

//   return {
//     walletPDA,
//     walletData,
//     balance,
//     loading,
//     refreshing,
//     createWallet,
//     deposit,
//     withdraw,
//     refresh,
//   };
// }