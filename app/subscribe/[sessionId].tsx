import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  View, 
  Text, 
  Alert, 
  ScrollView, 
  Linking, 
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useUnifiedWallet } from '@/hooks/useUnifiedWallet';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { subscriptionService, USDC_MINT } from '@/services/SubscriptionProtocolService';
import { PublicKey } from '@solana/web3.js';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import * as bs58 from 'bs58';
import nacl from 'tweetnacl';

interface CheckoutSession {
  sessionId: string;
  status: string;
  expiresAt: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  customerId: string;
  subscriptionPda?: string;
  merchant: {
    walletAddress: string; 
    companyName: string;
    logoUrl?: string;
  };
  plan: {
    planPda: string;
    planId: string;
    planName: string;
    feeAmount: string;
    paymentInterval: string;
    description?: string;
  };
  metadata?: {
    email: string;
    source: string;
  };
}

export default function SubscribeFromWebScreen() {
  const { sessionId } = useLocalSearchParams();
  const router = useRouter();
  const { wallets } = useEmbeddedSolanaWallet();
  const { publicKey, balance, subscribe, loading: walletLoading } = useUnifiedWallet();

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  const isConnected = !!publicKey;
  const monthlyFee = session ? parseFloat(session.plan.feeAmount) / 1_000_000 : 0;
  const requiredBalance = monthlyFee * 3;
  const hasEnoughBalance = balance.available >= requiredBalance;

  useEffect(() => {
    if (sessionId) {
      loadCheckoutSession();
    }
  }, [sessionId]);

  const loadCheckoutSession = async () => {
    try {
      const response = await fetch(
        `https://api.eventop.xyz/checkout/${sessionId}`
      );
      
      if (!response.ok) {
        throw new Error('Session not found or expired');
      }

      const data = await response.json();

       console.log('📦 Raw session data:', JSON.stringify(data, null, 2));
        console.log('🔑 Merchant wallet value:', data.merchantWallet);
      setSession(data);

      // Validate session hasn't expired
      if (new Date(data.expiresAt) < new Date()) {
        Alert.alert(
          'Session Expired',
          'This checkout session has expired. Please start over from the merchant website.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Check if already completed
      if (data.status === 'completed') {
        Alert.alert(
          'Already Subscribed',
          'You have already completed this subscription.',
          [
            { 
              text: 'View Subscription', 
              onPress: () => router.push(`/subscriptions/${data.subscriptionPda}`)
            }
          ]
        );
        return;
      }

    } catch (error) {
      console.error('Failed to load session:', error);
      Alert.alert(
        'Error',
        'Failed to load subscription details. Please try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!session || !publicKey) return;

    // Check balance first
    if (!hasEnoughBalance) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least $${requiredBalance.toFixed(2)} USDC (3 months buffer) in your wallet to subscribe.\n\nCurrent available: $${balance.available.toFixed(2)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Funds', 
            onPress: () => router.push('/wallet/deposit')
          }
        ]
      );
      return;
    }

    // Confirm subscription
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${session.plan.planName} from ${session.merchant.companyName} for $${monthlyFee.toFixed(2)}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: executeSubscription,
        },
      ]
    );
  };

  /**
   * Sign a message with the user's wallet to prove ownership
   */
  const signMessageWithWallet = async (message: string): Promise<string> => {
    try {
      const privyWallet = wallets?.[0];

      if (!privyWallet?.getProvider) {
        throw new Error('Wallet provider not available');
      }

      const provider = await privyWallet.getProvider?.();
      if (!provider) {
        throw new Error('Failed to get wallet provider');
      }

      const { signature } = await provider.request({
        method: "signMessage",
        params: { message },
      });

      // Some providers return the signature directly or inside an object
      // const signature = (response && typeof response === 'object' && 'signature' in response)
      //   ? (response as any).signature
      //   : response as string;

      // if (!signature) {
      //   throw new Error('No signature returned from wallet');
      // }
      
      // Privy returns signature as a base64 string for React Native
      // Convert base64 to base58 for backend verification
      const signatureBytes = Buffer.from(signature, 'base64');
      return bs58.encode(signatureBytes);
    } catch (error) {
      console.error('Error signing message:', error);
      throw new Error('Failed to sign message with wallet');
    }
  };

  const executeSubscription = async () => {
    if (!session || !publicKey) return;

    setSubscribing(true);

    try {
      // Step 1: Get merchant wallet from correct location
      const merchantWalletAddress = session.merchant.walletAddress; // ✅ Changed this line
      
      if (!merchantWalletAddress) {
        throw new Error('Merchant wallet address is missing');
      }

      console.log('🔑 Using merchant wallet:', merchantWalletAddress);

      // Step 2: Create PublicKey and execute on-chain subscription transaction
      const merchantPubkey = new PublicKey(merchantWalletAddress);
      const signature = await subscribe(merchantPubkey, session.plan.planId);

      // Step 3: Derive subscription PDA
      const pdaResult = await subscriptionService.findSubscriptionStatePDA(
        new PublicKey(publicKey),
        merchantPubkey,
        USDC_MINT
      );

      // Validate PDA was derived successfully
      if (!pdaResult || !pdaResult[0]) {
        throw new Error('Failed to derive subscription PDA');
      }

      const subscriptionPDA = pdaResult[0];
      const subscriptionPDAString = subscriptionPDA.toString();

      console.log('✅ Subscription PDA derived:', subscriptionPDAString);

      // Step 4: Create message to sign for wallet ownership proof
      const timestamp = Date.now();
      const message = `eventop-checkout:${sessionId}:${timestamp}`;

      // Step 5: Sign the message with user's wallet
      const walletSignature = await signMessageWithWallet(message);

      // Step 6: Complete checkout session on backend with all security proofs
      const completeResponse = await fetch(
        `https://api.eventop.xyz/checkout/${sessionId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionPda: subscriptionPDAString,
            userWallet: publicKey,
            signature: signature, // Transaction signature
            message: message, // The message that was signed
            walletSignature: walletSignature, // Signature proving wallet ownership
          })
        }
      );

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.message || 'Failed to complete checkout');
      }

      // Success! Show confirmation
      Alert.alert(
        '🎉 Subscription Active!',
        `You're now subscribed to ${session.plan.planName} from ${session.merchant.companyName}`,
        [
          {
            text: 'View Subscription',
            onPress: () => {
              router.replace(`../subscriptions/${subscriptionPDAString}`);
            }
          },
          {
            text: 'Return to Merchant',
            onPress: () => {
              Linking.openURL(session.successUrl);
              router.back();
            }
          },
        ]
      );

    } catch (error: any) {
      console.error('❌ Subscription failed:', error);
      
      // Provide more specific error messages
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.message?.includes('PDA')) {
        errorMessage = 'Failed to create subscription address. Please try again.';
      } else if (error.message?.includes('signature')) {
        errorMessage = 'Failed to verify wallet signature. Please try again.';
      } else if (error.message?.includes('Transaction')) {
        errorMessage = 'Transaction failed on blockchain. Please check your balance and try again.';
      } else if (error.message?.includes('expired')) {
        errorMessage = 'Session expired. Please start over from the merchant website.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Subscription Failed',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleSubscribe }
        ]
      );
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription process?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            if (session?.cancelUrl) {
              Linking.openURL(session.cancelUrl);
            } else {
              router.back();
            }
          }
        }
      ]
    );
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

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Card>
            <Text style={styles.emptyTitle}>Session Not Found</Text>
            <Text style={styles.emptyDescription}>
              This subscription session doesn't exist or has expired.
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
        <Text style={styles.title}>Subscribe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Merchant Header */}
        <Card style={styles.merchantCard}>
          <View style={styles.merchantHeader}>
            {session.merchant.logoUrl ? (
              <Image 
                source={{ uri: session.merchant.logoUrl }}
                style={styles.merchantLogo}
              />
            ) : (
              <View style={styles.merchantLogoPlaceholder}>
                <Text style={styles.merchantLogoText}>
                  {session.merchant.companyName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>
                {session.merchant.companyName}
              </Text>
              <Text style={styles.merchantSubtitle}>
                wants to subscribe you
              </Text>
            </View>
          </View>
        </Card>

        {/* Plan Details */}
        <Card>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan</Text>
              <Text style={styles.detailValue}>{session.plan.planName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={[styles.detailValue, styles.priceHighlight]}>
                ${monthlyFee.toFixed(2)}/month
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Billing Cycle</Text>
              <Text style={styles.detailValue}>
                Every {parseInt(session.plan.paymentInterval) / 86400} days
              </Text>
            </View>
          </View>

          {session.plan.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.description}>
                {session.plan.description}
              </Text>
            </View>
          )}
        </Card>

        {/* Account Info */}
        <Card>
          <Text style={styles.sectionTitle}>Your Account</Text>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{session.customerEmail}</Text>
            </View>

            {isConnected ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Wallet</Text>
                  <Text style={styles.detailValue}>
                    {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Available Balance</Text>
                  <Text style={styles.detailValue}>
                    ${balance.available.toFixed(2)} USDC
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.infoBox}>
                <AlertCircle size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                  Connect your wallet to continue
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Balance Warning */}
        {isConnected && !hasEnoughBalance && (
          <View style={styles.warningBox}>
            <AlertCircle size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Insufficient Balance</Text>
              <Text style={styles.warningText}>
                You need at least ${requiredBalance.toFixed(2)} USDC (3 months buffer) to subscribe.
                {'\n'}Current available: ${balance.available.toFixed(2)}
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
                You need to connect your wallet to complete this subscription.
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {isConnected ? (
          <Button
            onPress={handleSubscribe}
            loading={subscribing || walletLoading}
            disabled={subscribing || walletLoading}
            style={styles.subscribeButton}
          >
            {subscribing 
              ? 'Processing...' 
              : `Subscribe for $${monthlyFee.toFixed(2)}/mo`
            }
          </Button>
        ) : (
          <Button onPress={() => router.push('/profile')}>
            Connect Wallet
          </Button>
        )}

        <Button
          variant="outline"
          onPress={handleCancel}
          disabled={subscribing}
        >
          Cancel
        </Button>

        {/* Session Info */}
        <Text style={styles.sessionInfo}>
          Session ID: {sessionId}
        </Text>
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
    paddingVertical: spacing.xl,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  merchantLogo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
  },
  merchantLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantLogoText: {
    ...typography.h3,
    color: colors.foreground,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    ...typography.h3,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  merchantSubtitle: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  detailsContainer: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  priceHighlight: {
    color: colors.primary,
  },
  descriptionContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  descriptionLabel: {
    ...typography.small,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.foreground,
    lineHeight: 24,
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
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  infoText: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  subscribeButton: {
    marginTop: spacing.md,
  },
  sessionInfo: {
    ...typography.caption,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});