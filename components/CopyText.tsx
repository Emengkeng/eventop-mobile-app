import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';

interface CopyableTextProps {
  dataToCopy: string;
  displayText: string;
}

export function CopyableText({ dataToCopy, displayText }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(dataToCopy);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={copyToClipboard}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{displayText}</Text>
      <View style={styles.iconContainer}>
        {copied ? (
          <Check size={16} color={colors.success} />
        ) : (
          <Copy size={16} color={colors.mutedForeground} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  text: {
    ...typography.h3,
    color: colors.foreground,
  },
  iconContainer: {
    padding: spacing.xs,
  },
});