import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { QuickCapture } from '../src/components/QuickCapture';
import { useNotesStore } from '../src/stores/notes';
import { QuickCaptureData } from '../src/types';
import { attachmentToMarkdown } from '../src/services/media';
import { getInitialShareContent, subscribeToShareIntents } from '../src/services/shareIntent';

/**
 * Quick Capture screen for fast note creation.
 * Supports text input, voice recording, and photo attachments.
 * Handles share intents from other apps.
 */
export default function QuickCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sharedText?: string;
    sharedUrl?: string;
    folder?: string;
  }>();

  const [initialContent, setInitialContent] = useState('');
  const { addNote } = useNotesStore();

  // Handle initial share content and incoming share intents
  useEffect(() => {
    // Check for initial share content
    getInitialShareContent().then((data) => {
      if (data) {
        if (data.url) {
          setInitialContent(`${data.text || ''}\n\n${data.url}`.trim());
        } else if (data.text) {
          setInitialContent(data.text);
        }
      }
    });

    // Subscribe to incoming share intents
    const unsubscribe = subscribeToShareIntents((data) => {
      if (data.url) {
        setInitialContent(`${data.text || ''}\n\n${data.url}`.trim());
      } else if (data.text) {
        setInitialContent(data.text);
      }
    });

    return unsubscribe;
  }, []);

  // Also handle URL params (from internal navigation)
  useEffect(() => {
    if (params.sharedUrl) {
      setInitialContent(`${params.sharedText || ''}\n\n${params.sharedUrl}`.trim());
    } else if (params.sharedText) {
      setInitialContent(params.sharedText);
    }
  }, [params.sharedText, params.sharedUrl]);

  const handleSubmit = useCallback(
    async (data: QuickCaptureData) => {
      // Build the note content
      let content = data.content || '';

      // Add attachments as markdown
      if (data.attachments.length > 0) {
        const attachmentLines = data.attachments.map(attachmentToMarkdown);
        
        if (content) {
          content += '\n\n';
        }
        content += attachmentLines.join('\n\n');
      }

      // Create the note in the specified folder (if provided)
      const note = await addNote(data.title, content, params.folder);

      if (note) {
        // Navigate to the new note for editing
        router.replace(`/note/${note.id}`);
      } else {
        // Go back to notes list on error
        router.back();
      }
    },
    [addNote, router, params.folder]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <QuickCapture
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialContent={initialContent}
        showTitle={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
