import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useMWAWallet } from '@/hooks/useMWAWallet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { View, Wallet as WalletIcon } from 'lucide-react-native';

interface MWAWalletConnectorProps {
  onConnected?: (address: string, authToken: string) => void;
  onDisconnected?: () => void;
  showCard?: boolean;
}

export const MWAWalletConnector: React.FC<MWAWalletConnectorProps> = ({
  onConnected,
  onDisconnected,
  showCard = true,
}) => {
  const {
    address,
    authToken,
    isConnected,
    loading,
    connect,
    disconnect,
    loadCachedAuth,
  } = useMWAWallet();

  // Load cached auth on mount
  useEffect(() => {
    loadCachedAuth();
  }, []);

  // Notify parent component when connection changes
  useEffect(() => {
    if (isConnected && address && authToken && onConnected) {
      onConnected(address, authToken);
    } else if (!isConnected && onDisconnected) {
      onDisconnected();
    }
  }, [isConnected, address, authToken]);

  const content = (
    <>
      <View style={styles.cardHeader}>
        <WalletIcon size={20} color={colors.foreground} />
        <Text style={styles.cardTitle}>Solana Wallet</Text>
      </View>

      {!isConnected ? (
        <>
          <Text style={styles.description}>
            Connect your Solana wallet to manage your subscriptions
          </Text>
          <Button onPress={connect} loading={loading} disabled={loading}>
            Connect Wallet
          </Button>
        </>
      ) : (
        <>
          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Connected Wallet</Text>
            <Text style={styles.walletAddress}>
              {address?.slice(0, 8)}...{address?.slice(-8)}
            </Text>
          </View>
          <Button variant="outline" onPress={disconnect} disabled={loading}>
            Disconnect
          </Button>
        </>
      )}
    </>
  );

  if (showCard) {
    return <Card>{content}</Card>;
  }

  return <View style={styles.container}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
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
  description: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  walletInfo: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  walletLabel: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  walletAddress: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
});