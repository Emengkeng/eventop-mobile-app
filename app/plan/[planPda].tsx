import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react-native';
import { PublicKey } from '@solana/web3.js';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePlan } from '@/hooks/usePlans';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { planPda } = useLocalSearchParams<{ planPda: string }>();
  const { data: plan, isLoading, error } = usePlan(planPda);
  const { publicKey, balance, subscribe, loading: walletLoading } = useUnifiedWallet();
  const [subscribing, setSubscribing] = useState(false);

  const isConnected = !!publicKey;
  const monthlyFee = plan ? parseFloat(plan.feeAmount) / 1_000_000 : 0;
  const hasEnoughBalance = balance.available >= monthlyFee * 3;

  const handleSubscribe = async () => {
    if (!plan || !publicKey) return;

    // Check balance first
    if (!hasEnoughBalance) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least $${(monthlyFee * 3).toFixed(2)} USDC (3 months) in your wallet to subscribe.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Funds',
            onPress: () => router.push('../wallet/deposit'),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${plan.planName} for $${monthlyFee.toFixed(2)}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            setSubscribing(true);
            try {
              const merchantPubkey = new PublicKey(plan.merchantWallet);
              const signature = await subscribe(merchantPubkey, plan.planId);

              Alert.alert(
                'Success!',
                `Subscribed to ${plan.planName}`,
                [
                  {
                    text: 'View Subscription',
                    onPress: () => router.replace('/subscriptions'),
                  },
                  {
                    text: 'View Transaction',
                    onPress: () => {
                      console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('Subscription error:', error);
              Alert.alert(
                'Subscription Failed',
                error.message || 'Failed to subscribe. Please try again.'
              );
            } finally {
              setSubscribing(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Plan Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerContent}>
          <Card>
            <Text style={styles.emptyTitle}>Plan Not Found</Text>
            <Text style={styles.emptyDescription}>
              This plan doesn't exist or has been removed.
            </Text>
            <Button onPress={() => router.back()}>Go Back</Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Plan Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Plan Header Card */}
        <Card style={styles.planHeaderCard}>
          <View style={styles.planIcon}>
            <Text style={styles.planIconText}>
              {plan.planName.slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.planName}>{plan.planName}</Text>
          <Text style={styles.merchantName}>
            by {plan.merchantWallet.slice(0, 8)}...{plan.merchantWallet.slice(-4)}
          </Text>

          {plan.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{plan.category}</Text>
            </View>
          )}
        </Card>

        {/* Price Card */}
        <Card>
          <View style={styles.priceSection}>
            <View>
              <Text style={styles.priceLabel}>Subscription Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>${monthlyFee.toFixed(2)}</Text>
                <Text style={styles.priceInterval}>/month</Text>
              </View>
            </View>
            <DollarSign size={40} color={colors.primary} />
          </View>
        </Card>

        {/* Description */}
        {plan.description && (
          <Card>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{plan.description}</Text>
          </Card>
        )}

        {/* Features */}
        {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresList}>
              {plan.features.map((feature: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                  <CheckCircle size={20} color={colors.success} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Plan Info */}
        <Card>
          <Text style={styles.sectionTitle}>Plan Information</Text>

          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Clock size={20} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Billing Cycle</Text>
                <Text style={styles.infoValue}>Monthly</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Users size={20} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Subscribers</Text>
                <Text style={styles.infoValue}>{plan.totalSubscribers}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <DollarSign size={20} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Total Revenue</Text>
                <Text style={styles.infoValue}>
                  ${(parseFloat(plan.totalRevenue) / 1_000_000).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Balance Warning */}
        {isConnected && !hasEnoughBalance && (
          <View style={styles.warningBox}>
            <AlertCircle size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Insufficient Balance</Text>
              <Text style={styles.warningText}>
                You need at least $${(monthlyFee * 3).toFixed(2)} USDC (3 months buffer) to subscribe. 
                Current available: ${balance.available.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Not Connected Warning */}
        {!isConnected && (
          <View style={styles.infoBox}>
            <AlertCircle size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Connect Your Wallet</Text>
              <Text style={styles.infoText}>
                Connect your wallet to subscribe to this plan.
              </Text>
            </View>
          </View>
        )}

        {/* Subscribe Button */}
        {isConnected ? (
          <Button
            onPress={handleSubscribe}
            loading={subscribing || walletLoading}
            disabled={subscribing || walletLoading || !plan.isActive}
          >
            {subscribing
              ? 'Subscribing...'
              : !plan.isActive
              ? 'Plan Inactive'
              : `Subscribe for $${monthlyFee.toFixed(2)}/mo`}
          </Button>
        ) : (
          <Button onPress={() => router.push('/profile')}>
            Connect Wallet
          </Button>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
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
  planHeaderCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    position: 'relative',
  },
  planIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  planIconText: {
    ...typography.h2,
    color: colors.foreground,
  },
  planName: {
    ...typography.h2,
    color: colors.foreground,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  merchantName: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
  },
  categoryText: {
    ...typography.caption,
    color: colors.foreground,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    ...typography.small,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    ...typography.h1,
    fontSize: 36,
    color: colors.foreground,
  },
  priceInterval: {
    ...typography.body,
    color: colors.mutedForeground,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    color: colors.foreground,
    flex: 1,
  },
  infoRows: {
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.foreground,
    marginTop: spacing.xs,
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
  warningBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningContent: {
    flex: 1,
    gap: spacing.xs,
  },
  warningTitle: {
    ...typography.bodyMedium,
    color: colors.warning,
  },
  warningText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
});