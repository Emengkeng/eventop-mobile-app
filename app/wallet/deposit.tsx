import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
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
import { usePathname } from 'expo-router';

export default function DepositScreen() {
  const router = useRouter();
  const { user } = usePrivy();
  const { address, isConnected } = useWalletConnection();
  const pathname = usePathname();
  
  const {
    walletPDA,
    balance,
    loading: walletLoading,
    deposit,
    createWallet,
  } = useSubscriptionWallet(address || undefined);

  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Check if subscription wallet exists
  const hasWallet = !!walletPDA;

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
                // Optionally navigate back
                // router.back();
              }
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

        {/* Amount Input */}
        {isConnected && hasWallet && (
          <>
            {/* Current Balance */}
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Current Balance</Text>
              </View>

              <View style={styles.balanceContainer}>
                <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
                <Text style={styles.balanceLabel}>USDC</Text>
              </View>
            </Card>

            {/* Deposit Form */}
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
          </>
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
                // You could use Linking.openURL(explorerUrl) here
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
            3. Enter the amount you want to deposit{'\n'}
            4. Approve the transaction in your wallet{'\n'}
            5. Funds will appear in your Subscription Wallet
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
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  balanceAmount: {
    ...typography.h1,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    ...typography.small,
    color: colors.mutedForeground,
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