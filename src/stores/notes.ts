import { create } from 'zustand';
import { Note, NoteFilter } from '../types';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
} from '../services/notes';

interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
  filter: NoteFilter;

  // Actions
  fetchNotes: () => Promise<void>;
  addNote: (title: string, content?: string, folder?: string) => Promise<Note | null>;
  editNote: (id: string, content: string) => Promise<Note | null>;
  removeNote: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  setFilter: (filter: Partial<NoteFilter>) => void;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,
  filter: {
    sortBy: 'modified',
    sortOrder: 'desc',
  },

  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const notes = await listNotes(get().filter);
      set({ notes, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch notes';
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

  search: async (query: string) => {
    set({ loading: true, error: null });
    try {
      const notes = await searchNotes(query);
      set({ notes, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message, loading: false });
    }
  },

  setFilter: (filter: Partial<NoteFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
    get().fetchNotes();
  },

  clearError: () => set({ error: null }),
}));
