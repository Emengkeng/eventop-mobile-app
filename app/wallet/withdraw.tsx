import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';

export default function WithdrawScreen() {
  const router = useRouter();
  const { publicKey, balance, loading: walletLoading, withdraw, refreshBalance } = useUnifiedWallet();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const isConnected = !!publicKey;
  const maxWithdrawable = balance.available;

  const handleMaxAmount = () => {
    if (maxWithdrawable > 0) {
      setAmount(maxWithdrawable.toFixed(2));
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount > maxWithdrawable) {
      Alert.alert(
        'Insufficient Funds',
        `You can only withdraw up to $${maxWithdrawable.toFixed(2)}. The rest is reserved for active subscriptions.`
      );
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw $${withdrawAmount.toFixed(2)} USDC from your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const signature = await withdraw(withdrawAmount);
              
              if (signature) {
                Alert.alert(
                  'Success!',
                  `Withdrew $${withdrawAmount.toFixed(2)} USDC`,
                  [
                    {
                      text: 'View Transaction',
                      onPress: () => {
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
                'Withdrawal Failed',
                error.message || 'Failed to withdraw funds. Please try again.'
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
          <Text style={styles.title}>Withdraw</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContent}>
          <Card>
            <Text style={styles.emptyTitle}>Wallet Not Connected</Text>
            <Text style={styles.emptyDescription}>
              Please connect your wallet to withdraw funds
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
        <Text style={styles.title}>Withdraw</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance Overview */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>
                ${balance.total.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.balanceDivider} />
            
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available to Withdraw</Text>
              <Text style={[styles.balanceAmount, styles.availableAmount]}>
                ${balance.available.toFixed(2)}
              </Text>
            </View>
          </View>

          {balance.committed > 0 && (
            <View style={styles.reservedBox}>
              <AlertCircle size={16} color={colors.warning} />
              <View style={styles.reservedText}>
                <Text style={styles.reservedLabel}>
                  ${balance.committed.toFixed(2)} reserved
                </Text>
                <Text style={styles.reservedDescription}>
                  This amount is committed to active subscriptions
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Withdraw Form */}
        <Card>
          <Text style={styles.cardTitle}>Withdraw Amount</Text>
          
          <View style={styles.inputContainer}>
            <Input
              label="Amount (USDC)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!loading && !walletLoading && maxWithdrawable > 0}
            />
            
            {maxWithdrawable > 0 && (
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
                disabled={loading || walletLoading}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Warning if no funds available */}
          {maxWithdrawable === 0 && (
            <View style={styles.warningBox}>
              <AlertCircle size={16} color={colors.warning} />
              <Text style={styles.warningText}>
                No funds available to withdraw. All your balance is reserved for active subscriptions.
              </Text>
            </View>
          )}

          {/* Show remaining balance after withdrawal */}
          {amount && parseFloat(amount) > 0 && parseFloat(amount) <= maxWithdrawable && (
            <View style={styles.estimateBox}>
              <Text style={styles.estimateLabel}>Balance after withdrawal</Text>
              <Text style={styles.estimateValue}>
                ${(balance.total - parseFloat(amount)).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Error if trying to withdraw more than available */}
          {amount && parseFloat(amount) > maxWithdrawable && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Cannot withdraw more than ${maxWithdrawable.toFixed(2)}
              </Text>
            </View>
          )}

          <Button
            onPress={handleWithdraw}
            loading={loading || walletLoading}
            disabled={
              loading ||
              walletLoading ||
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > maxWithdrawable
            }
            style={styles.withdrawButton}
            variant={amount && parseFloat(amount) > 0 ? 'destructive' : 'default'}
          >
            {amount && parseFloat(amount) > 0
              ? `Withdraw $${parseFloat(amount).toFixed(2)}`
              : maxWithdrawable > 0
              ? 'Enter Amount'
              : 'No Funds Available'}
          </Button>
        </Card>

        {/* Additional Info */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            ℹ️ Funds reserved for subscriptions cannot be withdrawn. Cancel subscriptions 
            to free up those funds.
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
  balanceRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    ...typography.small,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    ...typography.h2,
    fontSize: 28,
    color: colors.foreground,
  },
  availableAmount: {
    color: colors.success,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  reservedBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  reservedText: {
    flex: 1,
  },
  reservedLabel: {
    ...typography.smallMedium,
    color: colors.warning,
  },
  reservedDescription: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.foreground,
    marginBottom: spacing.md,
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
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  warningText: {
    ...typography.small,
    color: colors.warning,
    flex: 1,
    lineHeight: 18,
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
    color: colors.foreground,
  },
  errorBox: {
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.destructive,
    textAlign: 'center',
  },
  withdrawButton: {
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