import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 80;

type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  syncStatus?: SyncStatus;
}

export function NoteCard({ note, onPress, onDelete, onArchive, syncStatus }: NoteCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeOpen = useRef<'left' | 'right' | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit the swipe distance
        const dx = Math.max(-ACTION_WIDTH * 2, Math.min(ACTION_WIDTH, gestureState.dx));
        translateX.setValue(dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right - archive
          Animated.spring(translateX, {
            toValue: ACTION_WIDTH,
            useNativeDriver: true,
          }).start();
          swipeOpen.current = 'right';
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left - delete
          Animated.spring(translateX, {
            toValue: -ACTION_WIDTH,
            useNativeDriver: true,
          }).start();
          swipeOpen.current = 'left';
        } else {
          // Reset
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          swipeOpen.current = null;
        }
      },
    })
  ).current;

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    swipeOpen.current = null;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: resetSwipe },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            resetSwipe();
            onDelete();
          }
        },
      ]
    );
  };

  const handleArchive = () => {
    if (onArchive) {
      Alert.alert(
        'Archive Note',
        `Move "${note.title}" to archive?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: resetSwipe },
          {
            text: 'Archive',
            onPress: () => {
              resetSwipe();
              onArchive();
            },
          },
        ]
      );
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPreview = () => {
    const content = note.content.replace(/^---[\s\S]*?---\s*/m, '').trim();
    const text = content.replace(/[#*_`\[\]]/g, '').trim();
    return text.slice(0, 80) + (text.length > 80 ? '...' : '');
  };

  const getSyncStatusDisplay = (): { icon: string; color: string; label: string } | null => {
    // Derive from note properties if syncStatus not provided
    const status = syncStatus || (note.conflicted ? 'conflict' : note.synced ? 'synced' : 'pending');
    
    switch (status) {
      case 'synced':
        return { icon: 'cloud-done-outline', color: '#34C759', label: 'Synced' };
      case 'pending':
        return { icon: 'cloud-upload-outline', color: '#FF9500', label: 'Pending sync' };
      case 'syncing':
        return { icon: 'sync-outline', color: '#007AFF', label: 'Syncing' };
      case 'conflict':
        return { icon: 'warning-outline', color: '#FF3B30', label: 'Conflict' };
      case 'error':
        return { icon: 'cloud-offline-outline', color: '#FF3B30', label: 'Sync error' };
      default:
        return null;
    }
  };

  const syncDisplay = getSyncStatusDisplay();

  return (
    <View style={styles.wrapper}>
      {/* Archive action (swipe right) */}
      <Animated.View
        style={[
          styles.actionContainer,
          styles.archiveAction,
          {
            opacity: translateX.interpolate({
              inputRange: [0, ACTION_WIDTH],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <TouchableOpacity style={styles.actionButton} onPress={handleArchive}>
          <Ionicons name="archive-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Archive</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Delete action (swipe left) */}
      <Animated.View
        style={[
          styles.actionContainer,
          styles.deleteAction,
          {
            opacity: translateX.interpolate({
              inputRange: [-ACTION_WIDTH, 0],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Card content */}
      <Animated.View
        style={[styles.container, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.touchable} onPress={onPress} activeOpacity={0.7}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {note.title}
              </Text>
              {syncDisplay && (
                <View style={styles.syncIndicator}>
                  <Ionicons name={syncDisplay.icon as any} size={16} color={syncDisplay.color} />
                </View>
              )}
            </View>
            <Text style={styles.preview} numberOfLines={2}>
              {getPreview()}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.date}>{formatDate(note.modified)}</Text>
              {note.folder && (
                <View style={styles.folder}>
                  <Ionicons name="folder-outline" size={12} color="#8E8E93" />
                  <Text style={styles.folderText}>{note.folder}</Text>
                </View>
              )}
              {note.tags && note.tags.length > 0 && (
                <View style={styles.tags}>
                  {note.tags.slice(0, 2).map((tag) => (
                    <Text key={tag} style={styles.tag}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}
              {syncDisplay && syncDisplay.label !== 'Synced' && (
                <Text style={[styles.syncLabel, { color: syncDisplay.color }]}>
                  {syncDisplay.label}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 6,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  archiveAction: {
    left: 0,
    backgroundColor: '#FF9500',
  },
  deleteAction: {
    right: 0,
    backgroundColor: '#FF3B30',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  touchable: {
    padding: 16,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  syncIndicator: {
    padding: 2,
  },
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  folderText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    fontSize: 12,
    color: '#007AFF',
  },
  syncLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
