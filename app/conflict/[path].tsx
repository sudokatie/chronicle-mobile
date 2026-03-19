import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ConflictDiff } from '../../src/components/ConflictDiff';
import { ConflictInfo } from '../../src/types';
import { resolveConflict } from '../../src/services/git';
import { getSetting } from '../../src/services/storage';

/**
 * Conflict resolution screen.
 * Shows diff between local and remote versions and allows resolution.
 */
export default function ConflictScreen(): React.ReactElement {
  const { path } = useLocalSearchParams<{ path: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';

  useEffect(() => {
    loadConflict();
  }, [path]);

  const loadConflict = async () => {
    if (!path) {
      setError('No file path provided');
      setLoading(false);
      return;
    }

    try {
      // For now, simulate loading conflict info
      // In production, this would read both versions from git
      const vaultPath = await getSetting<string>('vaultPath');
      if (!vaultPath) {
        throw new Error('Vault not configured');
      }

      // Placeholder - actual implementation would use git service
      // to get both local and remote content
      const mockConflict: ConflictInfo = {
        path: decodeURIComponent(path),
        localContent: '# Local Version\n\nYour local changes here...',
        remoteContent: '# Remote Version\n\nChanges from desktop...',
      };

      setConflict(mockConflict);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conflict';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (content: string) => {
    if (!conflict || !path) return;

    setResolving(true);
    try {
      const vaultPath = await getSetting<string>('vaultPath');
      if (!vaultPath) {
        throw new Error('Vault not configured');
      }

      await resolveConflict(vaultPath, decodeURIComponent(path), content);

      Alert.alert('Resolved', 'Conflict has been resolved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve conflict';
      Alert.alert('Error', message);
    } finally {
      setResolving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading conflict...</Text>
      </View>
    );
  }

  if (error || !conflict) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: '#ef4444' }]}>
          {error || 'Conflict not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          title: 'Resolve Conflict',
          headerBackTitle: 'Cancel',
        }}
      />

      {resolving ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: textColor }]}>Resolving...</Text>
        </View>
      ) : (
        <ConflictDiff
          conflict={conflict}
          onResolve={handleResolve}
          onCancel={handleCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
