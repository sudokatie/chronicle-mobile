import { create } from 'zustand';
import { Note, NoteFilter } from '../types';
import {
  listNotesPaginated,
  createNote,
  updateNote,
  deleteNote,
  archiveNote,
  searchNotesPaginated,
  refreshNoteCache,
  getFolders,
  PAGE_SIZE,
} from '../services/notes';

interface NotesState {
  notes: Note[];
  folders: string[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  filter: NoteFilter;
  hasMore: boolean;
  total: number;
  searchQuery: string;

  // Actions
  fetchNotes: () => Promise<void>;
  loadMoreNotes: () => Promise<void>;
  refreshCache: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  addNote: (title: string, content?: string, folder?: string) => Promise<Note | null>;
  editNote: (id: string, content: string) => Promise<Note | null>;
  removeNote: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  loadMoreSearch: () => Promise<void>;
  setFilter: (filter: Partial<NoteFilter>) => void;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  folders: [],
  loading: false,
  loadingMore: false,
  error: null,
  filter: {
    sortBy: 'modified',
    sortOrder: 'desc',
  },
  hasMore: false,
  total: 0,
  searchQuery: '',

  fetchFolders: async () => {
    try {
      const folders = await getFolders();
      set({ folders });
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  },

  fetchNotes: async () => {
    set({ loading: true, error: null, searchQuery: '' });
    try {
      const result = await listNotesPaginated(0, PAGE_SIZE, get().filter);
      set({
        notes: result.notes,
        hasMore: result.hasMore,
        total: result.total,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch notes';
      set({ error: message, loading: false });
    }
  },

  loadMoreNotes: async () => {
    const { notes, hasMore, loadingMore, filter, searchQuery } = get();
    if (!hasMore || loadingMore) return;

    set({ loadingMore: true });
    try {
      const result = searchQuery
        ? await searchNotesPaginated(searchQuery, notes.length, PAGE_SIZE)
        : await listNotesPaginated(notes.length, PAGE_SIZE, filter);

      set({
        notes: [...notes, ...result.notes],
        hasMore: result.hasMore,
        total: result.total,
        loadingMore: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more notes';
      set({ error: message, loadingMore: false });
    }
  },

  refreshCache: async () => {
    set({ loading: true, error: null });
    try {
      await refreshNoteCache();
      await get().fetchNotes();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh cache';
      set({ error: message, loading: false });
    }
  },

  addNote: async (title: string, content?: string, folder?: string) => {
    try {
      const note = await createNote(title, content, folder);
      set((state) => ({ notes: [note, ...state.notes] }));
      return note;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create note';
      set({ error: message });
      return null;
    }
  },

  editNote: async (id: string, content: string) => {
    try {
      const note = await updateNote(id, content);
      if (note) {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? note : n)),
        }));
      }
      return note;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update note';
      set({ error: message });
      return null;
    }
  },

  removeNote: async (id: string) => {
    try {
      await deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete note';
      set({ error: message });
    }
  },

  archiveNote: async (id: string) => {
    try {
      await archiveNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive note';
      set({ error: message });
    }
  },

  search: async (query: string) => {
    set({ loading: true, error: null, searchQuery: query });
    try {
      const result = await searchNotesPaginated(query, 0, PAGE_SIZE);
      set({
        notes: result.notes,
        hasMore: result.hasMore,
        total: result.total,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message, loading: false });
    }
  },

  loadMoreSearch: async () => {
    // Alias for loadMoreNotes - works for both search and regular lists
    await get().loadMoreNotes();
  },

  setFilter: (filter: Partial<NoteFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
    get().fetchNotes();
  },

  clearError: () => set({ error: null }),
}));
