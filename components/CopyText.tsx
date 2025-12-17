import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons'; 

interface CopyProps {
    dataToCopy: string;
    displayText: string;
}

export function CopyableText ({ 
    dataToCopy, 
    displayText 
}: CopyProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(dataToCopy);
    
    setCopied(true);
    
    Alert.alert('Copied!', `${displayText || dataToCopy} has been copied to your clipboard.`);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{displayText || dataToCopy}</Text>
      <TouchableOpacity onPress={copyToClipboard} style={styles.iconButton}>
        <MaterialIcons 
          name={copied ? "check-circle-outline" : "content-copy"} 
          size={24} 
          color={copied ? "green" : "blue"} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    margin: 10,
  },
  text: {
    flex: 1,
    marginRight: 10,
  },
  iconButton: {
    padding: 5,
  },
});