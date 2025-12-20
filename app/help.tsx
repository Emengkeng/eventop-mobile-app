import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, MessageCircle, Book, HelpCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function HelpScreen() {
  const router = useRouter();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@eventop.xyz?subject=Eventop App Support Request');
  };

  const handleDiscord = () => {
    Linking.openURL('https://discord.gg/eventop'); // TODO: Replace with actuall github link
  };

  const handleDocs = () => {
    Linking.openURL('https://docs.eventop.xyz');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Message */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>We're Here to Help! 👋</Text>
          <Text style={styles.heroText}>
            Having trouble with your subscriptions? Need help with payments? 
            We're committed to making your experience great.
          </Text>
        </Card>

        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>

          <TouchableOpacity onPress={handleEmailSupport}>
            <Card style={styles.contactCard}>
              <View style={styles.iconContainer}>
                <Mail size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactDescription}>
                  Get help from our team within 24 hours
                </Text>
              </View>
            </Card>
          </TouchableOpacity>

          {/* <TouchableOpacity onPress={handleDiscord}>
            <Card style={styles.contactCard}>
              <View style={styles.iconContainer}>
                <MessageCircle size={24} color={colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Join our Discord</Text>
                <Text style={styles.contactDescription}>
                  Chat with our community and team in real-time
                </Text>
              </View>
            </Card>
          </TouchableOpacity> */}
        </View>

        {/* Common Issues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Questions</Text>

          <Card>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>💰 How do I add funds?</Text>
              <Text style={styles.faqAnswer}>
                Tap "Add Funds" on your home screen or go to Profile → Wallet → Deposit
              </Text>
            </View>

            <View style={[styles.faqItem, styles.faqItemBorder]}>
              <Text style={styles.faqQuestion}>❌ How do I cancel a subscription?</Text>
              <Text style={styles.faqAnswer}>
                Go to Subscriptions, tap the subscription you want to cancel, 
                and select "Cancel Subscription"
              </Text>
            </View>

            <View style={[styles.faqItem, styles.faqItemBorder]}>
              <Text style={styles.faqQuestion}>🔒 Is my wallet secure?</Text>
              <Text style={styles.faqAnswer}>
                Yes! Your wallet is secured by Privy with industry-standard encryption. 
                Only you can access your funds.
              </Text>
            </View>

            <View style={[styles.faqItem, styles.faqItemBorder]}>
              <Text style={styles.faqQuestion}>💳 When are payments made?</Text>
              <Text style={styles.faqAnswer}>
                Payments are processed automatically on your billing date. 
                You'll get a notification 24 hours before.
              </Text>
            </View>
          </Card>
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learn More</Text>

          <TouchableOpacity onPress={handleDocs}>
            <Card style={styles.resourceCard}>
              <View style={styles.iconContainer}>
                <Book size={24} color={colors.primary} />
              </View>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceTitle}>Documentation</Text>
                <Text style={styles.resourceDescription}>
                  Browse our complete guides and tutorials
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Still Need Help CTA */}
        <Card style={styles.ctaCard}>
          <HelpCircle size={32} color={colors.primary} />
          <Text style={styles.ctaTitle}>Still need help?</Text>
          <Text style={styles.ctaText}>
            Our support team is ready to assist you with any issues
          </Text>
          <Button onPress={handleEmailSupport} style={styles.ctaButton}>
            Contact Support
          </Button>
        </Card>
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
  heroCard: {
    padding: spacing.xl,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  heroTitle: {
    ...typography.h3,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  heroText: {
    ...typography.body,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.foreground,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    ...typography.bodyMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  contactDescription: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  faqItem: {
    paddingVertical: spacing.md,
  },
  faqItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  faqQuestion: {
    ...typography.bodyMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    ...typography.small,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    ...typography.bodyMedium,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  resourceDescription: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  ctaCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  ctaTitle: {
    ...typography.h4,
    color: colors.foreground,
  },
  ctaText: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: spacing.sm,
  },
});