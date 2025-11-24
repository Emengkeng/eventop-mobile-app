import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { usePhantomDeeplinkWalletConnector } from '@privy-io/expo/connectors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Wallet as WalletIcon } from 'lucide-react-native';
import { APP_CONFIG } from '@/config/app';

interface WalletConnectorProps {
  onConnected?: (address: string) => void;
  onDisconnected?: () => void;
  showCard?: boolean;
  redirectUri?: string;
}

export const WalletConnector: React.FC<WalletConnectorProps> = ({
  onConnected,
  onDisconnected,
  showCard = true,
  redirectUri,
}) => {
  const {
    address,
    connect,
    disconnect,
    isConnected,
  } = usePhantomDeeplinkWalletConnector({
    appUrl: APP_CONFIG.APP_URL || 'https://api.devnet.solana.com',
    redirectUri: redirectUri || 'eventop://wallet/deposit',
  });

  const [loading, setLoading] = React.useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connect();
      if (address && onConnected) {
        onConnected(address);
      }
      Alert.alert('Success', 'Wallet connected successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      if (onDisconnected) {
        onDisconnected();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to disconnect wallet');
    }
  };

  React.useEffect(() => {
    if (isConnected && address && onConnected) {
      onConnected(address);
    }
  }, [isConnected, address]);

  const content = (
    <>
      <View style={styles.cardHeader}>
        <WalletIcon size={20} color={colors.foreground} />
        <Text style={styles.cardTitle}>External Wallet</Text>
      </View>

      {!isConnected ? (
        <>
          <Text style={styles.description}>
            Connect your Phantom wallet to deposit funds into your Subscription Wallet
          </Text>
          <Button onPress={handleConnect} loading={loading} disabled={loading}>
            Connect Phantom Wallet
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
          <Button variant="outline" onPress={handleDisconnect} disabled={loading}>
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

export const useWalletConnection = (redirectUri?: string) => {
  return usePhantomDeeplinkWalletConnector({
    appUrl: APP_CONFIG.APP_URL,
    redirectUri: redirectUri || 'eventop://wallet/deposit',
  });
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