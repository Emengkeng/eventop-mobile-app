import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, DollarSign, Activity, AlertCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/services/api';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { PublicKey } from '@solana/web3.js';

interface SubscriptionDetail {
  subscriptionPda: string;
  userWallet: string;
  merchantWallet: string;
  merchantPlanPda: string;
  feeAmount: string;
  paymentInterval: string;
  lastPaymentTimestamp: string;
  totalPaid: string;
  paymentCount: number;
  isActive: boolean;
  customerEmail: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  transactions?: Array<{
    id: string;
    signature: string;
    type: string;
    amount: string;
    blockTime: string;
    status: string;
  }>;
}

interface MerchantPlan {
  planPda: string;
  merchantWallet: string;
  planName: string;
  description?: string;
}

export default function SubscriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { cancelSubscription, loading: walletLoading } = useUnifiedWallet();

  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [merchantPlan, setMerchantPlan] = useState<MerchantPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSubscriptionDetail();
  }, [id]);

  const loadSubscriptionDetail = async () => {
    if (!id || typeof id !== 'string') {
      Alert.alert('Error', 'Invalid subscription ID');
      router.back();
      return;
    }

    try {
      setLoading(true);
      
      // Fetch subscription detail
      const subData = await apiService.getSubscriptionDetail(id);
      console.log("subscription data", subData)
      setSubscription(subData);

      // Fetch merchant plan details
      if (subData.merchantPlanPda) {
        try {
          const planData = await apiService.getPlanDetail(subData.merchantPlanPda);
          setMerchantPlan(planData);
        } catch (error) {
          console.log('Could not fetch plan details:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
      Alert.alert(
        'Error',
        'Failed to load subscription details. Please try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription? This action cannot be undone.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: executeCancel,
        },
      ]
    );
  };

  const executeCancel = async () => {
    if (!subscription) return;

    setCancelling(true);
    try {
      const merchantPubkey = new PublicKey(subscription.merchantWallet);
      await cancelSubscription(merchantPubkey);

      Alert.alert(
        'Success',
        'Subscription cancelled successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to cancel subscription. Please try again.'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!subscription) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Card>
            <Text style={styles.emptyTitle}>Subscription Not Found</Text>
            <Text style={styles.emptyDescription}>
              This subscription doesn't exist or you don't have access to it.
            </Text>
            <Button onPress={() => router.back()}>Go Back</Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const monthlyFee = parseFloat(subscription.feeAmount) / 1_000_000;
  const totalPaid = parseFloat(subscription.totalPaid) / 1_000_000;
  const lastPaymentDate = new Date(parseInt(subscription.lastPaymentTimestamp) * 1000);
  const paymentIntervalSeconds = parseInt(subscription.paymentInterval);
  const nextPaymentDate = new Date(lastPaymentDate.getTime() + paymentIntervalSeconds * 1000);
  const createdDate = new Date(subscription.createdAt);
  
  const daysUntilPayment = Math.ceil(
    (nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const merchantName = merchantPlan?.planName || 'Subscription Service';
  const planName = merchantPlan?.planName || 'Subscription Plan';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Subscription Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Merchant Card */}
        <Card style={styles.merchantCard}>
          <View style={styles.merchantIcon}>
            <Text style={styles.merchantIconText}>
              {merchantName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.merchantName}>{merchantName}</Text>
          <Text style={styles.planName}>{planName}</Text>
          
          <View style={[
            styles.statusBadge,
            !subscription.isActive && styles.inactiveBadge
          ]}>
            <View style={[
              styles.activeDot,
              !subscription.isActive && styles.inactiveDot
            ]} />
            <Text style={[
              styles.statusText,
              !subscription.isActive && styles.inactiveText
            ]}>
              {subscription.isActive ? 'Active' : 'Cancelled'}
            </Text>
          </View>
        </Card>

        {/* Next Payment Card */}
        {subscription.isActive && (
          <Card>
            <View style={styles.cardHeader}>
              <Calendar size={20} color={colors.foreground} />
              <Text style={styles.cardTitle}>Next Payment</Text>
            </View>

            <View style={styles.paymentInfo}>
              <View>
                <Text style={styles.paymentDate}>
                  {format(nextPaymentDate, 'MMMM d, yyyy')}
                </Text>
                <Text style={styles.paymentTime}>
                  in {daysUntilPayment} day{daysUntilPayment !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={styles.paymentAmount}>
                ${monthlyFee.toFixed(2)}
              </Text>
            </View>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <View style={styles.cardHeader}>
            <Activity size={20} color={colors.foreground} />
            <Text style={styles.cardTitle}>Payment History</Text>
          </View>

          <View style={styles.historyStats}>
            <View style={styles.historyStat}>
              <Text style={styles.historyStatLabel}>Total Paid</Text>
              <Text style={styles.historyStatValue}>
                ${totalPaid.toFixed(2)}
              </Text>
            </View>
            <View style={styles.historyDivider} />
            <View style={styles.historyStat}>
              <Text style={styles.historyStatLabel}>Payments</Text>
              <Text style={styles.historyStatValue}>{subscription.paymentCount}</Text>
            </View>
            <View style={styles.historyDivider} />
            <View style={styles.historyStat}>
              <Text style={styles.historyStatLabel}>Since</Text>
              <Text style={styles.historyStatValue}>
                {format(createdDate, 'MMM yyyy')}
              </Text>
            </View>
          </View>

          {/* Recent Transactions */}
          {subscription.transactions && subscription.transactions.length > 0 && (
            <View style={styles.timeline}>
              {subscription.transactions.slice(0, 5).map((tx) => (
                <View key={tx.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDate}>
                      {format(new Date(parseInt(tx.blockTime) * 1000), 'MMM d, yyyy')}
                    </Text>
                    <Text style={styles.timelineAmount}>
                      ${(parseFloat(tx.amount) / 1_000_000).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.timelineStatus}>
                    {tx.status === 'success' ? 'Success' : 'Failed'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Subscription Info */}
        <Card>
          <View style={styles.cardHeader}>
            <DollarSign size={20} color={colors.foreground} />
            <Text style={styles.cardTitle}>Subscription Info</Text>
          </View>

          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Subscription ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {subscription.subscriptionPda.slice(0, 8)}...{subscription.subscriptionPda.slice(-8)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Merchant</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {subscription.merchantWallet.slice(0, 8)}...{subscription.merchantWallet.slice(-8)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Billing Cycle</Text>
              <Text style={styles.infoValue}>
                Every {paymentIntervalSeconds / 86400} days
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Started</Text>
              <Text style={styles.infoValue}>
                {format(createdDate, 'MMM d, yyyy')}
              </Text>
            </View>
            {subscription.customerEmail && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{subscription.customerEmail}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Warning Box */}
        {subscription.isActive && (
          <View style={styles.warningBox}>
            <AlertCircle size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Automatic Renewal</Text>
              <Text style={styles.warningText}>
                Your subscription will automatically renew every {paymentIntervalSeconds / 86400} days. 
                Funds are deducted from your Subscription Wallet.
              </Text>
            </View>
          </View>
        )}

        {/* Cancelled Info */}
        {!subscription.isActive && subscription.cancelledAt && (
          <View style={styles.infoBox}>
            <AlertCircle size={20} color={colors.mutedForeground} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Subscription Cancelled</Text>
              <Text style={styles.infoText}>
                This subscription was cancelled on {format(new Date(subscription.cancelledAt), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {subscription.isActive && (
          <View style={styles.actions}>
            <Button 
              variant="destructive" 
              onPress={handleCancel}
              loading={cancelling || walletLoading}
              disabled={cancelling || walletLoading}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </Button>
          </View>
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
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.md,
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
  merchantCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    position: 'relative',
  },
  merchantIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  merchantIconText: {
    ...typography.h2,
    color: colors.foreground,
  },
  merchantName: {
    ...typography.h2,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  planName: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  inactiveDot: {
    backgroundColor: colors.mutedForeground,
  },
  statusText: {
    ...typography.caption,
    color: colors.success,
  },
  inactiveText: {
    color: colors.mutedForeground,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.foreground,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDate: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  paymentTime: {
    ...typography.small,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  paymentAmount: {
    ...typography.h3,
    color: colors.foreground,
  },
  historyStats: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  historyStat: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  historyStatValue: {
    ...typography.h4,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  historyDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  timeline: {
    gap: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  timelineAmount: {
    ...typography.small,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  timelineStatus: {
    ...typography.smallMedium,
    color: colors.success,
  },
  infoRows: {
    gap: spacing.md,
  },
  infoRow: {
    gap: spacing.xs,
  },
  infoLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.foreground,
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
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    ...typography.bodyMedium,
    color: colors.mutedForeground,
  },
  infoText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  actions: {
    gap: spacing.md,
  },
});