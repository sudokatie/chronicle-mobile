import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Paths } from 'expo-file-system';
import { cloneRepo } from '../../src/services/sync';
import { setSetting } from '../../src/services/storage';

/**
 * Git repository setup screen.
 */
export default function GitSetupScreen(): React.ReactElement {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [repoUrl, setRepoUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const cardBg = isDark ? '#18181b' : '#f4f4f5';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';

  const handleClone = async () => {
    if (!repoUrl.trim()) {
      Alert.alert('Error', 'Please enter a repository URL');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    setLoading(true);
    setProgress('Connecting to repository...');

    try {
      const vaultPath = `${Paths.document.uri}vault`;

      // Save settings first
      await setSetting('remoteUrl', repoUrl.trim());
      await setSetting('vaultPath', vaultPath);

      setProgress('Cloning repository...');
      await cloneRepo(repoUrl.trim(), vaultPath, {
        username: username.trim(),
        password: password || undefined,
      });

      setProgress('Done!');
      
      // Move to security setup
      router.push('/onboarding/security');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clone failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleSkip = async () => {
    // Set local vault path (created lazily by notes service)
    const vaultPath = `${Paths.document.uri}vault`;
    await setSetting('vaultPath', vaultPath);
    
    router.push('/onboarding/security');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="git-branch" size={40} color={accentColor} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Connect Your Vault</Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              Clone your Chronicle vault from a Git repository
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={[styles.inputGroup, { backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: mutedColor }]}>Repository URL</Text>
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={repoUrl}
                onChangeText={setRepoUrl}
                placeholder="https://github.com/user/notes.git"
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: mutedColor }]}>Username</Text>
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={username}
                onChangeText={setUsername}
                placeholder="GitHub username or email"
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={[styles.inputGroup, { backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: mutedColor }]}>Personal Access Token</Text>
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={password}
                onChangeText={setPassword}
                placeholder="ghp_xxxx (leave empty for public repos)"
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <Text style={[styles.hint, { color: mutedColor }]}>
              For private repositories, use a Personal Access Token instead of your password.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {loading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={[styles.progressText, { color: mutedColor }]}>{progress}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={handleClone}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Clone Repository</Text>
                <Ionicons name="cloud-download" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={[styles.skipText, { color: mutedColor }]}>
              Skip - Start with empty vault
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 16,
    padding: 0,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
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
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
  },
});
