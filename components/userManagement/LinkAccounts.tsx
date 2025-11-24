import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import {
  useLinkWithOAuth,
  useLinkEmail,
  usePrivy,
  // useLinkSMS,
  // useLinkWithFarcaster,
} from '@privy-io/expo';
import { useLinkWithPasskey } from '@privy-io/expo/passkey';
import { Github, Mail, Phone, Key } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

export default function LinkAccounts() {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const { user } = usePrivy();

  // const { linkWithFarcaster } = useLinkWithFarcaster({
  //   onSuccess: () => {
  //     console.log('Link Farcaster success');
  //     setError('');
  //   },
  //   onError: (err) => {
  //     console.log(err);
  //     setError(err.message);
  //   },
  // });

  const { sendCode: sendCodeEmail, linkWithCode: linkWithCodeEmail } =
    useLinkEmail({
      onError: (err) => {
        console.log(err);
        setError(err.message);
      },
      onLinkSuccess: () => {
        console.log('Link Email success');
        setError('');
        setEmail('');
        setEmailCode('');
        setEmailCodeSent(false);
      },
      onSendCodeSuccess: () => {
        console.log('Email code sent');
        setEmailCodeSent(true);
        setError('');
      },
    });

  // const { sendCode: sendCodeSMS, linkWithCode: linkWithCodeSMS } = useLinkSMS({
  //   onError: (err) => {
  //     console.log(err);
  //     setError(err.message);
  //   },
  //   onLinkSuccess: () => {
  //     console.log('Link SMS success');
  //     setError('');
  //     setPhone('');
  //     setSmsCode('');
  //     setSmsCodeSent(false);
  //   },
  //   onSendCodeSuccess: () => {
  //     console.log('SMS code sent');
  //     setSmsCodeSent(true);
  //     setError('');
  //   },
  // });

  const { linkWithPasskey } = useLinkWithPasskey({
    onError: (err) => {
      console.log(err);
      setError(err.message);
    },
    onSuccess: () => {
      setError('');
    },
  });

  const oauth = useLinkWithOAuth({
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

  const isLinked = (provider: string) => {
    return user?.linked_accounts.find(
      (account: any) => (account as any).type === `${provider}_oauth`
    ) !== undefined;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Link Accounts</Text>
        <Text style={styles.subtitle}>
          Connect additional accounts to enhance your profile
        </Text>

        {/* OAuth Providers */}
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
                    <View style={styles.iconContainer}>
                      {React.createElement(providerIcons[provider] || Mail, {
                        size: 20,
                        color: linked ? colors.success : colors.foreground,
                      })}
                    </View>
                    <Text style={styles.providerName}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.buttonContainer}>
                    {linked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                      >
                        Connected
                      </Button>
                    ) : (<>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={oauth.state.status === 'loading'}
                        onPress={() => oauth.link({ provider })}
                      >
                        Connect
                      </Button>
                    </>)}
                    
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Passkey */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Card>
            <View style={styles.passkeyContent}>
              <View style={styles.providerInfo}>
                <View style={styles.iconContainer}>
                  <Key size={20} color={colors.foreground} />
                </View>
                <View style={styles.passkeyText}>
                  <Text style={styles.providerName}>Passkey</Text>
                  <Text style={styles.passkeyDescription}>
                    Secure biometric authentication
                  </Text>
                </View>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() =>
                  linkWithPasskey({
                    relyingParty:
                      Constants.expoConfig?.extra?.passkeyAssociatedDomain,
                  })
                }
              >
                Add Passkey
              </Button>
            </View>
          </Card>
        </View>

        {/* Email Linking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <Card>
            <View style={styles.formContent}>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {!emailCodeSent ? (
                <Button onPress={() => sendCodeEmail({ email })}>
                  Send Code
                </Button>
              ) : (
                <>
                  <Input
                    value={emailCode}
                    onChangeText={setEmailCode}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                  />
                  <Button
                    onPress={() => linkWithCodeEmail({ code: emailCode, email })}
                  >
                    Verify Email
                  </Button>
                </>
              )}
            </View>
          </Card>
        </View>

        {/* SMS Linking */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone Number</Text>
          <Card>
            <View style={styles.formContent}>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
              {!smsCodeSent ? (
                <Button onPress={() => sendCodeSMS({ phone })}>
                  Send Code
                </Button>
              ) : (
                <>
                  <Input
                    value={smsCode}
                    onChangeText={setSmsCode}
                    placeholder="Enter verification code"
                    keyboardType="number-pad"
                  />
                  <Button
                    onPress={() => linkWithCodeSMS({ code: smsCode, phone })}
                  >
                    Verify Phone
                  </Button>
                </>
              )}
            </View>
          </Card>
        </View> */}

        {/* Farcaster */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Web3</Text>
          <Card>
            <View style={styles.passkeyContent}>
              <View style={styles.providerInfo}>
                <View style={styles.iconContainer}>
                  <Mail size={20} color={colors.foreground} />
                </View>
                <View style={styles.passkeyText}>
                  <Text style={styles.providerName}>Farcaster</Text>
                  <Text style={styles.passkeyDescription}>
                    Connect your Farcaster account
                  </Text>
                </View>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => linkWithFarcaster({})}
              >
                Connect
              </Button>
            </View>
          </Card>
        </View> */}

        {/* Error Display */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}
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
  providerName: {
    ...typography.bodyMedium,
    color: colors.foreground,
  },
  buttonContainer: {
    minWidth: 100,
  },
  passkeyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  passkeyText: {
    flex: 1,
    gap: spacing.xs,
  },
  passkeyDescription: {
    ...typography.small,
    color: colors.mutedForeground,
  },
  formContent: {
    gap: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.destructive + '10',
    borderColor: colors.destructive,
  },
  errorText: {
    ...typography.small,
    color: colors.destructive,
  },
});