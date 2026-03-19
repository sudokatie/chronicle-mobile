import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { ConflictInfo } from '../types';

interface ConflictDiffProps {
  conflict: ConflictInfo;
  onResolve: (content: string) => void;
  onCancel: () => void;
}

type Resolution = 'local' | 'remote' | 'both';

/**
 * Conflict resolution component with side-by-side diff view.
 */
export function ConflictDiff({
  conflict,
  onResolve,
  onCancel,
}: ConflictDiffProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const cardBg = isDark ? '#18181b' : '#f4f4f5';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';
  const localColor = isDark ? '#22c55e' : '#16a34a';
  const remoteColor = isDark ? '#3b82f6' : '#2563eb';

  const handleResolve = () => {
    if (!selectedResolution) return;

    let resolvedContent: string;
    switch (selectedResolution) {
      case 'local':
        resolvedContent = conflict.localContent;
        break;
      case 'remote':
        resolvedContent = conflict.remoteContent;
        break;
      case 'both':
        resolvedContent = `${conflict.localContent}\n\n---\n\n${conflict.remoteContent}`;
        break;
    }

    onResolve(resolvedContent);
  };

  const getPreview = (content: string, maxLines: number = 10): string => {
    const lines = content.split('\n').slice(0, maxLines);
    if (content.split('\n').length > maxLines) {
      lines.push('...');
    }
    return lines.join('\n');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Resolve Conflict</Text>
        <Text style={[styles.path, { color: mutedColor }]}>{conflict.path}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Local Version */}
        <TouchableOpacity
          style={[
            styles.versionCard,
            { backgroundColor: cardBg, borderColor },
            selectedResolution === 'local' && { borderColor: localColor, borderWidth: 2 },
          ]}
          onPress={() => setSelectedResolution('local')}
        >
          <View style={styles.versionHeader}>
            <View style={[styles.badge, { backgroundColor: localColor }]}>
              <Text style={styles.badgeText}>Local</Text>
            </View>
            <Text style={[styles.versionLabel, { color: mutedColor }]}>Your changes</Text>
          </View>
          <Text style={[styles.codePreview, { color: textColor }]}>
            {getPreview(conflict.localContent)}
          </Text>
        </TouchableOpacity>

        {/* Remote Version */}
        <TouchableOpacity
          style={[
            styles.versionCard,
            { backgroundColor: cardBg, borderColor },
            selectedResolution === 'remote' && { borderColor: remoteColor, borderWidth: 2 },
          ]}
          onPress={() => setSelectedResolution('remote')}
        >
          <View style={styles.versionHeader}>
            <View style={[styles.badge, { backgroundColor: remoteColor }]}>
              <Text style={styles.badgeText}>Remote</Text>
            </View>
            <Text style={[styles.versionLabel, { color: mutedColor }]}>Desktop changes</Text>
          </View>
          <Text style={[styles.codePreview, { color: textColor }]}>
            {getPreview(conflict.remoteContent)}
          </Text>
        </TouchableOpacity>

        {/* Keep Both Option */}
        <TouchableOpacity
          style={[
            styles.bothCard,
            { backgroundColor: cardBg, borderColor },
            selectedResolution === 'both' && { borderColor: '#f59e0b', borderWidth: 2 },
          ]}
          onPress={() => setSelectedResolution('both')}
        >
          <Text style={[styles.bothText, { color: textColor }]}>
            Keep Both (merge with separator)
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: borderColor }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={[styles.cancelText, { color: mutedColor }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.resolveButton,
            !selectedResolution && styles.resolveButtonDisabled,
          ]}
          onPress={handleResolve}
          disabled={!selectedResolution}
        >
          <Text style={styles.resolveText}>
            {selectedResolution ? `Use ${selectedResolution}` : 'Select version'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  path: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  versionCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  versionLabel: {
    fontSize: 14,
  },
  codePreview: {
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  bothCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  bothText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resolveButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  resolveButtonDisabled: {
    backgroundColor: '#71717a',
  },
  resolveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
