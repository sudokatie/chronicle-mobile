import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NoteCard } from '../../src/components/NoteCard';
import { searchNotes } from '../../src/services/notes';
import { useNotesStore } from '../../src/stores/notes';
import { Note } from '../../src/types';

interface RecentSearch {
  query: string;
  timestamp: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const { removeNote, archiveNote } = useNotesStore();

  // Load recent searches from memory (in a real app, use AsyncStorage)
  useEffect(() => {
    // Placeholder for loading recent searches
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const notes = await searchNotes(trimmed);
      setResults(notes);

      // Add to recent searches
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.query !== trimmed);
        return [{ query: trimmed, timestamp: Date.now() }, ...filtered].slice(0, 10);
      });
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    handleSearch(query);
  }, [query, handleSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  }, []);

  const handleRecentSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    handleSearch(searchQuery);
  }, [handleSearch]);

  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const handleNotePress = useCallback((noteId: string) => {
    router.push(`/note/${noteId}`);
  }, [router]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    await removeNote(noteId);
    setResults((prev) => prev.filter((n) => n.id !== noteId));
  }, [removeNote]);

  const handleArchiveNote = useCallback(async (noteId: string) => {
    await archiveNote(noteId);
    setResults((prev) => prev.filter((n) => n.id !== noteId));
  }, [archiveNote]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search tips */}
      {!hasSearched && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Search Tips</Text>
          <View style={styles.tip}>
            <Ionicons name="text-outline" size={16} color="#8E8E93" />
            <Text style={styles.tipText}>Search by title or content</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="pricetag-outline" size={16} color="#8E8E93" />
            <Text style={styles.tipText}>Include #tags in your search</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="link-outline" size={16} color="#8E8E93" />
            <Text style={styles.tipText}>Search for [[wiki links]]</Text>
          </View>
        </View>
      )}

      {/* Recent searches */}
      {!hasSearched && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={handleClearRecent}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((item) => (
            <TouchableOpacity
              key={item.timestamp}
              style={styles.recentItem}
              onPress={() => handleRecentSearch(item.query)}
            >
              <Ionicons name="time-outline" size={18} color="#8E8E93" />
              <Text style={styles.recentQuery}>{item.query}</Text>
              <Ionicons name="arrow-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      {hasSearched && !loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (hasSearched) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptySubtitle}>
            No notes match "{query}"
          </Text>
          <Text style={styles.emptyHint}>
            Try different keywords or check your spelling
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes..."
            placeholderTextColor="#8E8E93"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        {query.length > 0 && (
          <TouchableOpacity style={styles.searchButton} onPress={handleSubmit}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => handleNotePress(item.id)}
            onDelete={() => handleDeleteNote(item.id)}
            onArchive={() => handleArchiveNote(item.id)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  clearButton: {
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    padding: 16,
  },
  tipsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
  },
  recentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  clearText: {
    fontSize: 14,
    color: '#007AFF',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  recentQuery: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  resultsHeader: {
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
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
  emptyHint: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
});
