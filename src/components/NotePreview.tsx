import React from 'react';
import { ScrollView, StyleSheet, useColorScheme } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface NotePreviewProps {
  content: string;
}

/**
 * Markdown preview component for notes.
 * Renders markdown content with proper styling.
 */
export function NotePreview({ content }: NotePreviewProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const markdownStyles = StyleSheet.create({
    body: {
      color: isDark ? '#e4e4e7' : '#18181b',
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      color: isDark ? '#fafafa' : '#09090b',
      fontSize: 28,
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#3f3f46' : '#e4e4e7',
      paddingBottom: 8,
    },
    heading2: {
      color: isDark ? '#fafafa' : '#09090b',
      fontSize: 24,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 10,
    },
    heading3: {
      color: isDark ? '#fafafa' : '#09090b',
      fontSize: 20,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 12,
    },
    link: {
      color: isDark ? '#60a5fa' : '#2563eb',
      textDecorationLine: 'underline',
    },
    blockquote: {
      backgroundColor: isDark ? '#27272a' : '#f4f4f5',
      borderLeftWidth: 4,
      borderLeftColor: isDark ? '#71717a' : '#a1a1aa',
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 12,
    },
    code_inline: {
      backgroundColor: isDark ? '#27272a' : '#f4f4f5',
      color: isDark ? '#f472b6' : '#db2777',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
      fontSize: 14,
    },
    code_block: {
      backgroundColor: isDark ? '#18181b' : '#f4f4f5',
      padding: 12,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 14,
      marginVertical: 12,
    },
    fence: {
      backgroundColor: isDark ? '#18181b' : '#f4f4f5',
      padding: 12,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 14,
      marginVertical: 12,
    },
    list_item: {
      marginBottom: 4,
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    hr: {
      backgroundColor: isDark ? '#3f3f46' : '#e4e4e7',
      height: 1,
      marginVertical: 16,
    },
    table: {
      borderWidth: 1,
      borderColor: isDark ? '#3f3f46' : '#e4e4e7',
      marginVertical: 12,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: isDark ? '#3f3f46' : '#e4e4e7',
    },
    th: {
      backgroundColor: isDark ? '#27272a' : '#f4f4f5',
      padding: 8,
      fontWeight: '600',
    },
    td: {
      padding: 8,
    },
    image: {
      marginVertical: 12,
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      <Markdown style={markdownStyles}>{content}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});
