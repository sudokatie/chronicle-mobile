import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SyncState } from '../types';

interface SyncStatusProps {
  state: SyncState;
  onSync: () => void;
}

/**
 * Sync status indicator component.
 * Shows current sync state and allows manual sync trigger.
 */
export function SyncStatus({ state, onSync }: SyncStatusProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const backgroundColor = isDark ? '#18181b' : '#f4f4f5';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';

  const getStatusIcon = (): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (state.status) {
      case 'syncing':
        return { name: 'sync', color: '#3b82f6' };
      case 'error':
        return { name: 'alert-circle', color: '#ef4444' };
      case 'idle':
      default:
        if (state.pendingChanges > 0) {
          return { name: 'cloud-upload', color: '#f59e0b' };
        }
        return { name: 'cloud-done', color: '#22c55e' };
    }
  };

  const getStatusText = (): string => {
    switch (state.status) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return state.error || 'Sync error';
      case 'idle':
      default:
        if (state.pendingChanges > 0) {
          return `${state.pendingChanges} pending`;
        }
        if (state.lastSync) {
          return formatLastSync(state.lastSync);
        }
        return 'Synced';
    }
  };

  const formatLastSync = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const { name: iconName, color: iconColor } = getStatusIcon();
  const isSyncing = state.status === 'syncing';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={onSync}
      disabled={isSyncing}
      accessibilityRole="button"
      accessibilityLabel="Sync status"
      accessibilityHint={isSyncing ? 'Currently syncing' : 'Tap to sync'}
    >
      <View style={styles.iconContainer}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={iconName} size={20} color={iconColor} />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.statusText, { color: textColor }]} numberOfLines={1}>
          {getStatusText()}
        </Text>
        {state.status === 'error' && state.lastSync && (
          <Text style={[styles.lastSyncText, { color: mutedColor }]}>
            Last sync: {formatLastSync(state.lastSync)}
          </Text>
        )}
      </View>

      {!isSyncing && (
        <Ionicons
          name="refresh"
          size={18}
          color={mutedColor}
          style={styles.refreshIcon}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshIcon: {
    marginLeft: 8,
  },
});
