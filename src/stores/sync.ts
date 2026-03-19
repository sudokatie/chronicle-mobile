import { create } from 'zustand';
import { SyncState, SyncResult } from '../types';
import * as syncService from '../services/sync';

interface SyncStore {
  state: SyncState;
  lastSync: Date | null;
  pendingCount: number;

  // Actions
  startSync: () => Promise<SyncResult>;
  initialize: () => Promise<void>;
  addPending: (path: string, action: 'create' | 'update' | 'delete') => Promise<void>;
  clearError: () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  state: {
    status: 'idle',
    lastSync: null,
    pendingChanges: 0,
    error: null,
  },
  lastSync: null,
  pendingCount: 0,

  startSync: async () => {
    const result = await syncService.sync();
    const newState = syncService.getSyncState();
    set({
      state: newState,
      lastSync: newState.lastSync,
      pendingCount: newState.pendingChanges,
    });
    return result;
  },

  initialize: async () => {
    await syncService.initSync();
    const state = syncService.getSyncState();

    // Subscribe to state changes
    syncService.onSyncStateChange((newState) => {
      set({
        state: newState,
        lastSync: newState.lastSync,
        pendingCount: newState.pendingChanges,
      });
    });

    set({
      state,
      lastSync: state.lastSync,
      pendingCount: state.pendingChanges,
    });
  },

  addPending: async (path: string, action: 'create' | 'update' | 'delete') => {
    await syncService.queueChange(path, action);
    const state = syncService.getSyncState();
    set({ pendingCount: state.pendingChanges });
  },

  clearError: () => {
    set((prev) => ({
      state: { ...prev.state, error: null },
    }));
  },
}));
