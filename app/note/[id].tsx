import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useNote } from '../../src/hooks/useNote';
import { NoteEditor } from '../../src/components/NoteEditor';
import { NotePreview } from '../../src/components/NotePreview';

/**
 * Note editor screen.
 * Displays a single note for editing with preview toggle.
 */
export default function NoteScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [showPreview, setShowPreview] = useState(false);
  const { note, loading, error, saving, dirty, content, setContent, save } = useNote(id);

  const handleSave = useCallback(async () => {
    if (dirty) {
      await save();
    }
  }, [dirty, save]);

  const handleBack = useCallback(async () => {
    if (dirty) {
      Alert.alert(
        'Unsaved Changes',
        'Do you want to save before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Save',
            onPress: async () => {
              const success = await save();
              if (success) {
                router.back();
              }
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [dirty, save, router]);

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';

  // Loading state
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading note...</Text>
      </View>
    );
  }

  // Error state
  if (error || !note) {
    return (
      <View style={[styles.centered, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: '#ef4444' }]}>
          {error || 'Note not found'}
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={[styles.errorButtonText, { color: accentColor }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          title: note.title,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: accentColor }]}>
                {dirty ? 'Done' : 'Back'}
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {saving && (
                <ActivityIndicator size="small" color={accentColor} style={styles.savingIndicator} />
              )}
              {dirty && !saving && (
                <View style={styles.dirtyIndicator} />
              )}
              <TouchableOpacity onPress={togglePreview} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: accentColor }]}>
                  {showPreview ? 'Edit' : 'Preview'}
                </Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {showPreview ? (
        <NotePreview content={content} />
      ) : (
        <NoteEditor
          content={content}
          onChange={setContent}
          onSave={handleSave}
          showPreview={showPreview}
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
    marginBottom: 16,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingIndicator: {
    marginRight: 4,
  },
  dirtyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
});
