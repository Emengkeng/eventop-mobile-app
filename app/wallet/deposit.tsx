import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MWAWalletConnector } from '@/components/walletActions/MWAWalletConnector';
import { useSubscriptionWallet } from '@/hooks/useSubscriptionProtocol';
import { radius } from '@/theme/radius';

export default function DepositScreen() {
  const router = useRouter();
  
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connectedAuthToken, setConnectedAuthToken] = useState<string | null>(null);
  
  const {
    walletPDA,
    balance: subscriptionWalletBalance,
    loading: walletLoading,
    deposit,
    createWallet,
  } = useSubscriptionWallet(connectedAddress || undefined, connectedAuthToken || undefined);

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const hasWallet = !!walletPDA;
  const isConnected = !!connectedAddress;

  const handleWalletConnected = (address: string, authToken: string) => {
    setConnectedAddress(address);
    setConnectedAuthToken(authToken);
  };

  const handleWalletDisconnected = () => {
    setConnectedAddress(null);
    setConnectedAuthToken(null);
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    try {
      const success = await createWallet();
      if (success) {
        Alert.alert('Success', 'Subscription wallet created!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Deposit Funds</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Wallet Connection */}
        <MWAWalletConnector
          onConnected={handleWalletConnected}
          onDisconnected={handleWalletDisconnected}
        />

        {/* Create Subscription Wallet */}
        {isConnected && !hasWallet && (
          <Card>
            <Text style={styles.cardTitle}>Create Subscription Wallet</Text>
            <Text style={styles.description}>
              You need to create a subscription wallet before you can deposit funds.
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

        {/* Deposit Form */}
        {isConnected && hasWallet && (
          <>
            <Card>
              <Text style={styles.cardTitle}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                ${subscriptionWalletBalance.toFixed(2)}
              </Text>
            </Card>

            <Card>
              <Text style={styles.cardTitle}>Deposit Amount</Text>
              <Input
                label="Amount (USDC)"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!loading}
              />
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