import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { usePrivy } from '@privy-io/expo';
import { usePhantomDeeplinkWalletConnector } from '@privy-io/expo/connectors';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useWalletStore } from '@/store/walletStore';
import { WalletConnector } from '@/components/walletActions/WalletConnector';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet
// const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet

const RPC_URL = 'https://api.devnet.solana.com';

export default function DepositScreen() {
  const router = useRouter();
  const { user } = usePrivy();
  const { subscriptionWalletPda } = useWalletStore();
  
  const {
    address,
    isConnected,
    signAndSendTransaction,
  } = usePhantomDeeplinkWalletConnector({
    appUrl: 'https://eventop.xyz',
    redirectUri: '/deposit',
  });

  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [connection] = React.useState(() => new Connection(RPC_URL, 'confirmed'));

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    if (!subscriptionWalletPda) {
      Alert.alert('Error', 'Subscription wallet not initialized');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    Alert.alert(
      'Confirm Deposit',
      `Deposit ${amount} USDC to your Subscription Wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const fromPubkey = new PublicKey(address);
              const toPubkey = new PublicKey(subscriptionWalletPda);

              // Convert USDC amount to smallest unit (6 decimals)
              const amountInSmallestUnit = Math.floor(parseFloat(amount) * 1_000_000);

              // Get associated token accounts
              const fromTokenAccount = await getAssociatedTokenAddress(
                USDC_MINT,
                fromPubkey
              );

              const toTokenAccount = await getAssociatedTokenAddress(
                USDC_MINT,
                toPubkey
              );

              // Check if destination token account exists
              const toAccountInfo = await connection.getAccountInfo(toTokenAccount);

              // Create transaction
              const transaction = new Transaction();
              const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

              transaction.recentBlockhash = blockhash;
              transaction.lastValidBlockHeight = lastValidBlockHeight;
              transaction.feePayer = fromPubkey;

              // If destination token account doesn't exist, create it first
              if (!toAccountInfo) {
                transaction.add(
                  createAssociatedTokenAccountInstruction(
                    fromPubkey, // payer
                    toTokenAccount, // associated token account
                    toPubkey, // owner
                    USDC_MINT // mint
                  )
                );
              }

              // Add transfer instruction
              transaction.add(
                createTransferInstruction(
                  fromTokenAccount,
                  toTokenAccount,
                  fromPubkey,
                  amountInSmallestUnit,
                  [],
                  TOKEN_PROGRAM_ID
                )
              );

              // Sign and send transaction using Privy
              const signature = await signAndSendTransaction(transaction);

              Alert.alert(
                'Success',
                'Deposit completed successfully!',
                [
                  {
                    text: 'View Transaction',
                    onPress: () => {
                      // Open Solana explorer
                      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
                      console.log('Transaction:', explorerUrl);
                    },
                  },
                  { text: 'OK', onPress: () => router.back() },
                ]
              );
              setAmount('');
            } catch (error: any) {
              console.error('Deposit error:', error);
              Alert.alert('Error', error.message || 'Deposit failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Deposit Funds</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Wallet Connection */}
        <WalletConnector />

        {/* Amount Input */}
        {isConnected && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Deposit Amount</Text>
            </View>

            <Input
              label="Amount (USDC)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!loading}
            />

            <View style={styles.quickAmounts}>
              {['10', '25', '50', '100'].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(quickAmount)}
                  disabled={loading}
                >
                  <Text style={styles.quickAmountText}>${quickAmount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              onPress={handleDeposit}
              loading={loading}
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {amount ? `Deposit $${amount}` : 'Deposit'}
            </Button>
          </Card>
        )}

        {/* Subscription Wallet Info */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Destination</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subscription Wallet</Text>
            <Text style={styles.infoValue}>
              {subscriptionWalletPda
                ? `${subscriptionWalletPda.slice(0, 8)}...${subscriptionWalletPda.slice(-8)}`
                : 'Not created yet'}
            </Text>
          </View>

          {subscriptionWalletPda && (
            <TouchableOpacity 
              style={styles.viewExplorer}
              onPress={() => {
                const explorerUrl = `https://explorer.solana.com/address/${subscriptionWalletPda}?cluster=devnet`;
                console.log('Explorer:', explorerUrl);
              }}
            >
              <Text style={styles.viewExplorerText}>View on Explorer</Text>
              <ExternalLink size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1. Connect your Phantom wallet{'\n'}
            2. Enter the amount you want to deposit{'\n'}
            3. Approve the transaction in your wallet{'\n'}
            4. Funds will appear in your Subscription Wallet
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.foreground,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.foreground,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  quickAmountText: {
    ...typography.smallMedium,
    color: colors.foreground,
  },
  infoRow: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  infoLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  viewExplorer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  viewExplorerText: {
    ...typography.smallMedium,
    color: colors.primary,
  },
  infoBox: {
    padding: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  infoTitle: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  infoText: {
    ...typography.small,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});