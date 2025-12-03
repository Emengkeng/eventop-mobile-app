import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';

export default function DepositScreen() {
  const router = useRouter();
  const { publicKey, balance, loading: walletLoading, deposit, refreshBalance } = useUnifiedWallet();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const isConnected = !!publicKey;

  const quickAmounts = [10, 25, 50, 100];

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const depositAmount = parseFloat(amount);

    Alert.alert(
      'Confirm Deposit',
      `Add $${depositAmount.toFixed(2)} USDC to your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const signature = await deposit(depositAmount);
              
              if (signature) {
                Alert.alert(
                  'Success!',
                  `Deposited $${depositAmount.toFixed(2)} USDC`,
                  [
                    {
                      text: 'View Transaction',
                      onPress: () => {
                        // Open Solana Explorer
                        console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
                      }
                    },
                    { text: 'Done' }
                  ]
                );
                setAmount('');
                await refreshBalance();
              }
            } catch (error: any) {
              Alert.alert(
                'Deposit Failed',
                error.message || 'Failed to deposit funds. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Funds</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContent}>
          <Card>
            <Text style={styles.emptyTitle}>Wallet Not Connected</Text>
            <Text style={styles.emptyDescription}>
              Please connect your wallet to add funds
            </Text>
            <Button onPress={() => router.push('/profile')}>
              Go to Profile
            </Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Funds</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Balance */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            ${balance.total.toFixed(2)}
          </Text>
          
          <View style={styles.balanceBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Available</Text>
              <Text style={styles.breakdownValue}>
                ${balance.available.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Reserved</Text>
              <Text style={styles.breakdownValue}>
                ${balance.committed.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Info size={16} color={colors.primary} />
            <Text style={styles.infoTitle}>How deposits work</Text>
          </View>
          <Text style={styles.infoText}>
            Funds are deposited to your subscription wallet. They'll be used automatically 
            for your subscription payments each month.
          </Text>
        </View>

        {/* Deposit Form */}
        <Card>
          <Text style={styles.cardTitle}>Deposit Amount</Text>
          
          <Input
            label="Amount (USDC)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!loading && !walletLoading}
          />

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={[
                  styles.quickAmountButton,
                  amount === quickAmount.toString() && styles.quickAmountButtonActive,
                ]}
                onPress={() => handleQuickAmount(quickAmount)}
                disabled={loading || walletLoading}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  ${quickAmount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Estimated Balance After Deposit */}
          {amount && parseFloat(amount) > 0 && (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateLabel}>Balance after deposit</Text>
              <Text style={styles.estimateValue}>
                ${(balance.total + parseFloat(amount)).toFixed(2)}
              </Text>
            </View>
          )}

          <Button
            onPress={handleDeposit}
            loading={loading || walletLoading}
            disabled={loading || walletLoading || !amount || parseFloat(amount) <= 0}
            style={styles.depositButton}
          >
            {amount && parseFloat(amount) > 0
              ? `Deposit $${parseFloat(amount).toFixed(2)}`
              : 'Enter Amount'}
          </Button>
        </Card>

        {/* Additional Info */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            💡 Tip: Keep enough balance to cover 3 months of subscriptions to avoid 
            service interruptions.
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  balanceCard: {
    padding: spacing.lg,
  },
  balanceLabel: {
    ...typography.small,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    ...typography.h1,
    fontSize: 36,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
  breakdownValue: {
    ...typography.bodyMedium,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  breakdownDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  infoBox: {
    padding: spacing.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    gap: spacing.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  cardTitle: {
    ...typography.h4,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: colors.primary,
  },
  quickAmountText: {
    ...typography.smallMedium,
    color: colors.foreground,
  },
  quickAmountTextActive: {
    color: colors.primary,
  },
  estimateBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  estimateLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  estimateValue: {
    ...typography.bodyMedium,
    color: colors.success,
  },
  depositButton: {
    marginTop: spacing.lg,
  },
  noteBox: {
    padding: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
  },
  noteText: {
    ...typography.small,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});