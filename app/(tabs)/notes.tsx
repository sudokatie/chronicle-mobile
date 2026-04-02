import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NoteCard } from '../../src/components/NoteCard';
import { SearchBar } from '../../src/components/SearchBar';
import { FolderPicker } from '../../src/components/FolderPicker';
import { SortPicker } from '../../src/components/SortPicker';
import { useNotesStore } from '../../src/stores/notes';
import { useSyncStore } from '../../src/stores/sync';
import { initDatabase } from '../../src/services/storage';

export default function NotesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [initialized, setInitialized] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    notes,
    folders,
    loading,
    loadingMore,
    hasMore,
    error,
    filter,
    fetchNotes,
    loadMoreNotes,
    refreshCache,
    fetchFolders,
    removeNote,
    search,
    setFilter,
    clearError,
  } = useNotesStore();

  const { state: syncState } = useSyncStore();

  useEffect(() => {
    async function init() {
      await initDatabase();
      setInitialized(true);
      // Initial fetch from cache (fast)
      await fetchNotes();
      await fetchFolders();
      // Refresh cache in background (updates FTS index)
      refreshCache();
    }
    init();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  // Debounced search (300ms debounce for search input)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        search(query);
      } else {
        fetchNotes();
      }
    }, 300);
  }, [search, fetchNotes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchFolders();
    await refreshCache();
  }, [fetchFolders, refreshCache]);

  // Load more when reaching end of list
  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      loadMoreNotes();
    }
  }, [hasMore, loadingMore, loading, loadMoreNotes]);

  const handleNotePress = useCallback((noteId: string) => {
    router.push(`/note/${noteId}`);
  }, [router]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    await removeNote(noteId);
  }, [removeNote]);

  const handleFolderSelect = useCallback((folder: string | undefined) => {
    setFilter({ folder });
  }, [setFilter]);

  const handleSortSelect = useCallback((sortBy: 'modified' | 'created' | 'title', sortOrder: 'asc' | 'desc') => {
    setFilter({ sortBy, sortOrder });
  }, [setFilter]);

  const handleCreateNote = useCallback(() => {
    Alert.prompt(
      'New Note',
      'Enter a title for your note:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (title: string | undefined) => {
            if (title?.trim()) {
              const note = await useNotesStore.getState().addNote(title.trim(), '', filter.folder);
              if (note) {
                router.push(`/note/${note.id}`);
              }
            }
          },
        },
      ],
      'plain-text'
    );
  }, [router, filter.folder]);

  const getSyncStatusForNote = (note: any) => {
    if (note.conflicted) return 'conflict';
    if (syncState.status === 'syncing') return 'syncing';
    if (!note.synced) return 'pending';
    return 'synced';
  };

  // Footer component for loading more indicator
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  }, [loadingMore]);

  if (!initialized) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar value={searchQuery} onChangeText={handleSearch} />

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <FolderPicker
          folders={folders}
          selectedFolder={filter.folder}
          onSelect={handleFolderSelect}
        />
        <SortPicker
          sortBy={filter.sortBy}
          sortOrder={filter.sortOrder}
          onSelect={handleSortSelect}
        />
      </View>

      {/* Active filters indicator */}
      {filter.folder && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFilterLabel}>Showing:</Text>
          <TouchableOpacity
            style={styles.activeFilterChip}
            onPress={() => handleFolderSelect(undefined)}
          >
            <Ionicons name="folder" size={14} color="#007AFF" />
            <Text style={styles.activeFilterText}>{filter.folder}</Text>
            <Ionicons name="close-circle" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => handleNotePress(item.id)}
            onDelete={() => handleDeleteNote(item.id)}
            syncStatus={getSyncStatusForNote(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={notes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Notes Yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No notes match your search'
                : filter.folder
                ? `No notes in "${filter.folder}"`
                : 'Tap + to create your first note'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleCreateNote}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  activeFilterLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
