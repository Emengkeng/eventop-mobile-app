import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Wallet, Shield, Zap, X } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Button } from '@/components/ui/Button';

interface FirstTimeSetupModalProps {
  visible: boolean;
  onContinue: () => void;
  onClose: () => void;
}

export function FirstTimeSetupModal({ 
  visible, 
  onContinue, 
  onClose 
}: FirstTimeSetupModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color={colors.foreground} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Wallet size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>One-Time Setup</Text>
            <Text style={styles.subtitle}>
              We'll create your subscription wallet to get you started
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Shield size={20} color={colors.success} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Secure & Automatic</Text>
                <Text style={styles.featureDescription}>
                  Your funds are safely stored on-chain and payments happen automatically
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Zap size={20} color={colors.warning} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Fast Setup</Text>
                <Text style={styles.featureDescription}>
                  This is a one-time process that takes just a few seconds
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Wallet size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Full Control</Text>
                <Text style={styles.featureDescription}>
                  You can deposit, withdraw, or cancel subscriptions anytime
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your wallet will be created automatically when you make your first deposit. 
              This requires one transaction approval.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button 
              onPress={onContinue}
              style={styles.continueButton}
            >
              Continue
            </Button>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  features: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.small,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  infoBox: {
    padding: spacing.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    ...typography.small,
    color: colors.mutedForeground,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  continueButton: {
    width: '100%',
  },
  cancelText: {
    ...typography.bodyMedium,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});