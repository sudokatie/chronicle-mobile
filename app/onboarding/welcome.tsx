import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * Welcome screen - first step of onboarding.
 */
export default function WelcomeScreen(): React.ReactElement {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name="document-text" size={64} color={accentColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: textColor }]}>Welcome to Chronicle</Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>
          Your notes, everywhere you go
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="sync"
            title="Git Sync"
            description="Sync with your desktop vault via Git"
            color={accentColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <FeatureItem
            icon="create-outline"
            title="Quick Capture"
            description="Jot down ideas on the go"
            color={accentColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />
          <FeatureItem
            icon="lock-closed"
            title="Secure"
            description="Biometric and PIN protection"
            color={accentColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={() => router.push('/onboarding/git-setup')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  textColor: string;
  mutedColor: string;
}

function FeatureItem({ icon, title, description, color, textColor, mutedColor }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: mutedColor }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  features: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
