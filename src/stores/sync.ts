import { create } from 'zustand';
import { SyncState, SyncResult, NetworkState } from '../types';
import * as syncService from '../services/sync';

interface SyncStore {
  state: SyncState;
  lastSync: Date | null;
  pendingCount: number;
  networkState: NetworkState;
  isBackgroundSyncEnabled: boolean;
  backgroundSyncInterval: number;
  syncOnReconnect: boolean;

  // Actions
  startSync: () => Promise<SyncResult>;
  initialize: () => Promise<void>;
  addPending: (path: string, action: 'create' | 'update' | 'delete') => Promise<void>;
  clearError: () => void;
  setBackgroundSync: (enabled: boolean, intervalMinutes?: number) => Promise<void>;
  setSyncOnReconnect: (enabled: boolean) => Promise<void>;
  isNetworkAvailable: () => boolean;
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
  networkState: {
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  },
  isBackgroundSyncEnabled: false,
  backgroundSyncInterval: 15,
  syncOnReconnect: true,

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
    const networkState = syncService.getNetworkState();
    const isBackgroundRegistered = await syncService.isBackgroundSyncRegistered();

    // Subscribe to sync state changes
    syncService.onSyncStateChange((newState) => {
      set({
        state: newState,
        lastSync: newState.lastSync,
        pendingCount: newState.pendingChanges,
      });
    });

    // Subscribe to network state changes
    syncService.onNetworkStateChange((newNetworkState) => {
      set({ networkState: newNetworkState });
    });

    set({
      state,
      lastSync: state.lastSync,
      pendingCount: state.pendingChanges,
      networkState,
      isBackgroundSyncEnabled: isBackgroundRegistered,
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

  setBackgroundSync: async (enabled: boolean, intervalMinutes?: number) => {
    await syncService.updateBackgroundSyncSettings(enabled, intervalMinutes);
    set({
      isBackgroundSyncEnabled: enabled,
      ...(intervalMinutes !== undefined && { backgroundSyncInterval: intervalMinutes }),
    });
  },

  setSyncOnReconnect: async (enabled: boolean) => {
    await syncService.updateSyncOnReconnect(enabled);
    set({ syncOnReconnect: enabled });
  },

  isNetworkAvailable: () => {
    return syncService.isNetworkAvailable();
  },
}));
