import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { usePrivy, useUnlinkOAuth } from '@privy-io/expo';
import { Github, Mail, CheckCircle2, XCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const providerIcons: Record<string, any> = {
  github: Github,
  google: Mail,
  discord: Mail,
  apple: Mail,
  twitter: Mail,
  spotify: Mail,
  instagram: Mail,
  tiktok: Mail,
  linkedin: Mail,
  line: Mail,
};

export default function UnlinkAccounts() {
  const [error, setError] = useState('');
  const { user } = usePrivy();

  // const { unlinkFarcaster } = useUnlinkFarcaster({
  //   onError: (err) => {
  //     console.log(err);
  //     setError(err.message);
  //   },
  //   onSuccess: () => {
  //     console.log('Unlink Farcaster success');
  //     setError('');
  //   },
  // });

  const oauth = useUnlinkOAuth({
    onError: (err) => {
      console.log(err);
      setError(err.message);
    },
    onSuccess: () => {
      setError('');
    },
  });

  const providers = [
    'google',
    // 'apple',
    'twitter',
  ] as const;

  const handleUnlink = (provider: string) => {
    const linkedAccount = user?.linked_accounts.find(
      (account: any) => (account as any).type === `${provider}_oauth`
    );

    if (!linkedAccount) return;

    Alert.alert(
      'Unlink Account',
      `Are you sure you want to unlink your ${provider.charAt(0).toUpperCase() + provider.slice(1)} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => {
            oauth.unlinkOAuth({
              provider: provider as any,
              subject: (linkedAccount as any)?.subject,
            });
          },
        },
      ]
    );
  };

  // const handleUnlinkFarcaster = () => {
  //   const farcasterAccount = user?.linked_accounts.find(
  //     (account: any) => (account as any).type === 'farcaster'
  //   ) as any | undefined;

  //   if (!farcasterAccount) return;

  //   Alert.alert(
  //     'Unlink Farcaster',
  //     'Are you sure you want to unlink your Farcaster account?',
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'Unlink',
  //         style: 'destructive',
  //         onPress: () => {
  //           unlinkFarcaster({ fid: farcasterAccount.fid });
  //         },
  //       },
  //     ]
  //   );
  // };

  const isLinked = (provider: string) => {
    return user?.linked_accounts.find(
      (account: any) => (account as any).type === `${provider}_oauth`
    ) !== undefined;
  };

  const isFarcasterLinked = () => {
    return user?.linked_accounts.find(
      (account: any) => (account as any).type === 'farcaster'
    ) !== undefined;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Manage Linked Accounts</Text>
        <Text style={styles.subtitle}>
          Remove connected accounts from your profile
        </Text>

        {/* Connected Accounts Summary */}
        <Card>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Connected Accounts</Text>
            <Text style={styles.summaryValue}>
              {user?.linked_accounts.length || 0}
            </Text>
          </View>
        </Card>

        {/* Social Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Accounts</Text>
          <Card noPadding>
            {providers.map((provider, index) => {
              const linked = isLinked(provider);
              return (
                <View
                  key={provider}
                  style={[
                    styles.providerItem,
                    index === providers.length - 1 && styles.lastItem,
                  ]}
                >
                  <View style={styles.providerInfo}>
                    <View
                      style={[
                        styles.iconContainer,
                        linked && styles.iconContainerLinked,
                      ]}
                    >
                      {React.createElement(providerIcons[provider] || Mail, {
                        size: 20,
                        color: linked ? colors.success : colors.mutedForeground,
                      })}
                    </View>
                    <View style={styles.providerText}>
                      <Text style={styles.providerName}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </Text>
                      <View style={styles.statusRow}>
                        {linked ? (
                          <>
                            <CheckCircle2
                              size={14}
                              color={colors.success}
                            />
                            <Text style={styles.statusLinked}>Connected</Text>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} color={colors.mutedForeground} />
                            <Text style={styles.statusUnlinked}>
                              Not connected
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button
                      size="sm"
                      variant={linked ? 'destructive' : 'ghost'}
                      disabled={!linked}
                      onPress={() => handleUnlink(provider)}
                    >
                      {linked ? 'Unlink' : 'N/A'}
                    </Button>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Web3 Accounts */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Web3</Text>
          <Card>
            <View style={styles.providerItem}>
              <View style={styles.providerInfo}>
                <View
                  style={[
                    styles.iconContainer,
                    isFarcasterLinked() && styles.iconContainerLinked,
                  ]}
                >
                  <Mail
                    size={20}
                    color={
                      isFarcasterLinked()
                        ? colors.success
                        : colors.mutedForeground
                    }
                  />
                </View>
                <View style={styles.providerText}>
                  <Text style={styles.providerName}>Farcaster</Text>
                  <View style={styles.statusRow}>
                    {isFarcasterLinked() ? (
                      <>
                        <CheckCircle2 size={14} color={colors.success} />
                        <Text style={styles.statusLinked}>Connected</Text>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} color={colors.mutedForeground} />
                        <Text style={styles.statusUnlinked}>Not connected</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  size="sm"
                  variant={isFarcasterLinked() ? 'destructive' : 'ghost'}
                  disabled={!isFarcasterLinked()}
                  onPress={handleUnlinkFarcaster}
                >
                  {isFarcasterLinked() ? 'Unlink' : 'N/A'}
                </Button>
              </View>
            </View>
          </Card>
        </View> */}

        {/* Error Display */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {/* Warning Note */}
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ Make sure you have at least one login method connected before unlinking accounts.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.foreground,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.primary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.smallMedium,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerLinked: {
    backgroundColor: colors.success + '20',
  },
  providerText: {
    flex: 1,
    gap: spacing.xs,
  },
  providerName: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusLinked: {
    ...typography.small,
    color: colors.success,
  },
  statusUnlinked: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  buttonContainer: {
    minWidth: 80,
  },
  errorCard: {
    backgroundColor: colors.destructive + '10',
    borderColor: colors.destructive,
  },
  errorText: {
    ...typography.small,
    color: colors.destructive,
  },
  warningCard: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning,
  },
  warningText: {
    ...typography.small,
    color: colors.warning,
  },
});