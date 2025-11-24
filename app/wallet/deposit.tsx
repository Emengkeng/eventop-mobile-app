import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, ArrowDown } from 'lucide-react-native';
import { usePrivy } from '@privy-io/expo';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WalletConnector, useWalletConnection } from '@/components/walletActions/WalletConnector';
import { useSubscriptionWallet } from '@/hooks/useSubscriptionProtocol';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { APP_CONFIG } from '@/config/app';

const USDC_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

export default function DepositScreen() {
  const router = useRouter();
  const { user } = usePrivy();
  const { address, isConnected } = useWalletConnection();
  
  const {
    walletPDA,
    balance: subscriptionWalletBalance,
    loading: walletLoading,
    deposit,
    createWallet,
  } = useSubscriptionWallet(address || undefined);

  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [connectedWalletBalance, setConnectedWalletBalance] = React.useState<number>(0);
  const [loadingBalance, setLoadingBalance] = React.useState(false);

  // Check if subscription wallet exists
  const hasWallet = !!walletPDA;

  // Fetch connected wallet balance
  React.useEffect(() => {
    if (address && isConnected) {
      fetchConnectedWalletBalance();
    } else {
      setConnectedWalletBalance(0);
    }
  }, [address, isConnected]);

  const fetchConnectedWalletBalance = async () => {
    if (!address) return;

    setLoadingBalance(true);
    try {
      const connection = new Connection(
        APP_CONFIG.RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      );

      const userPublicKey = new PublicKey(address);
      const tokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        userPublicKey
      );

      const balance = await connection.getTokenAccountBalance(tokenAccount);
      const usdcBalance = parseFloat(balance.value.uiAmount?.toString() || '0');
      setConnectedWalletBalance(usdcBalance);
    } catch (error) {
      console.error('Error fetching connected wallet balance:', error);
      setConnectedWalletBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    try {
      const success = await createWallet();
      if (success) {
        Alert.alert('Success', 'Subscription wallet created! You can now deposit funds.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    if (!hasWallet) {
      Alert.alert('Error', 'Please create a subscription wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > connectedWalletBalance) {
      Alert.alert('Error', `Insufficient balance. You have ${connectedWalletBalance.toFixed(2)} USDC`);
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
              const success = await deposit(parseFloat(amount));
              if (success) {
                setAmount('');
                // Refresh balances
                await fetchConnectedWalletBalance();
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMaxAmount = () => {
    if (connectedWalletBalance > 0) {
      setAmount(connectedWalletBalance.toString());
    }
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
        <WalletConnector redirectUri="/wallet/deposit" />

        {/* Create Subscription Wallet (if needed) */}
        {isConnected && !hasWallet && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Create Subscription Wallet</Text>
            </View>

            <Text style={styles.description}>
              You need to create a subscription wallet before you can deposit funds. This is a one-time setup.
            </Text>

            <Button
              onPress={handleCreateWallet}
              loading={loading || walletLoading}
              disabled={loading || walletLoading}
            >
              Create Subscription Wallet
            </Button>
          </Card>
        )}

        {/* Balance Overview */}
        {isConnected && hasWallet && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Balance Overview</Text>
            </View>

            {/* Connected Wallet Balance */}
            <View style={styles.balanceRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Phantom Wallet</Text>
                <Text style={styles.balanceAmount}>
                  {loadingBalance ? '...' : `$${connectedWalletBalance.toFixed(2)}`}
                </Text>
                <Text style={styles.balanceSubtext}>Available to deposit</Text>
              </View>
            </View>

            <View style={styles.arrowContainer}>
              <ArrowDown size={20} color={colors.mutedForeground} />
            </View>

            {/* Subscription Wallet Balance */}
            <View style={styles.balanceRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Subscription Wallet</Text>
                <Text style={styles.balanceAmount}>
                  ${subscriptionWalletBalance.toFixed(2)}
                </Text>
                <Text style={styles.balanceSubtext}>Used for subscriptions</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchConnectedWalletBalance}
              disabled={loadingBalance}
            >
              <Text style={styles.refreshText}>
                {loadingBalance ? 'Refreshing...' : 'Refresh Balances'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Deposit Form */}
        {isConnected && hasWallet && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Deposit Amount</Text>
            </View>

            <View style={styles.inputContainer}>
              <Input
                label="Amount (USDC)"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
                disabled={loading || connectedWalletBalance === 0}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickAmounts}>
              {['10', '25', '50', '100'].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(quickAmount)}
                  disabled={loading || parseFloat(quickAmount) > connectedWalletBalance}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      parseFloat(quickAmount) > connectedWalletBalance && styles.disabledText,
                    ]}
                  >
                    ${quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              onPress={handleDeposit}
              loading={loading}
              disabled={
                loading ||
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > connectedWalletBalance
              }
            >
              {amount ? `Deposit $${amount}` : 'Deposit'}
            </Button>

            {parseFloat(amount) > connectedWalletBalance && connectedWalletBalance > 0 && (
              <Text style={styles.errorText}>
                Insufficient balance in Phantom wallet
              </Text>
            )}
          </Card>
        )}

        {/* Subscription Wallet Info */}
        {walletPDA && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Subscription Wallet</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Wallet Address</Text>
              <Text style={styles.infoValue}>
                {walletPDA.slice(0, 8)}...{walletPDA.slice(-8)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewExplorer}
              onPress={() => {
                const explorerUrl = `https://explorer.solana.com/address/${walletPDA}?cluster=devnet`;
                console.log('Explorer:', explorerUrl);
              }}
            >
              <Text style={styles.viewExplorerText}>View on Explorer</Text>
              <ExternalLink size={16} color={colors.primary} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1. Connect your Phantom wallet{'\n'}
            2. Create your subscription wallet (one-time){'\n'}
            3. Check your Phantom wallet balance{'\n'}
            4. Enter the amount you want to deposit{'\n'}
            5. Approve the transaction in your wallet{'\n'}
            6. Funds will appear in your Subscription Wallet
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
  description: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  balanceRow: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  balanceInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  balanceLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  balanceAmount: {
    ...typography.h2,
    color: colors.foreground,
  },
  balanceSubtext: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  refreshButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
  },
  refreshText: {
    ...typography.smallMedium,
    color: colors.primary,
  },
  inputContainer: {
    position: 'relative',
  },
  maxButton: {
    position: 'absolute',
    right: spacing.md,
    top: 38,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  maxButtonText: {
    ...typography.smallMedium,
    color: colors.background,
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
  disabledText: {
    color: colors.mutedForeground,
    opacity: 0.5,
  },
  errorText: {
    ...typography.small,
    color: colors.destructive,
    textAlign: 'center',
    marginTop: spacing.sm,
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