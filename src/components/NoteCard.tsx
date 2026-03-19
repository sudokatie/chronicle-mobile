import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, onPress, onDelete }: NoteCardProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
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

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {note.title}
          </Text>
          {!note.synced && (
            <Ionicons name="cloud-upload-outline" size={16} color="#FF9500" />
          )}
          {note.conflicted && (
            <Ionicons name="warning-outline" size={16} color="#FF3B30" />
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
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  deleteButton: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
});
