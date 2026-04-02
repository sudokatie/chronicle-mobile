import { SyncState, SyncResult, Author, NetworkState, ConflictState, GitCredentials } from '../types';
import * as gitService from './git';
import {
  getSetting,
  getSyncQueue,
  clearSyncQueue,
  addToSyncQueue,
  setSetting,
} from './storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

// Background task name
const BACKGROUND_SYNC_TASK = 'chronicle-background-sync';

// Sync state
let currentState: SyncState = {
  status: 'idle',
  lastSync: null,
  pendingChanges: 0,
  error: null,
};

// Network state
let networkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown',
};

// Network listener unsubscribe function
let networkUnsubscribe: NetInfoSubscription | null = null;

// Flag to track if sync should run on reconnect
let pendingSyncOnReconnect = false;

// State change listeners
const listeners: Set<(state: SyncState) => void> = new Set();

// Network state listeners
const networkListeners: Set<(state: NetworkState) => void> = new Set();

/**
 * Notify all listeners of state change.
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener(currentState);
  }
}

/**
 * Notify all network listeners of state change.
 */
function notifyNetworkListeners(): void {
  for (const listener of networkListeners) {
    listener(networkState);
  }
}

/**
 * Update sync state.
 */
function setState(updates: Partial<SyncState>): void {
  currentState = { ...currentState, ...updates };
  notifyListeners();
}

/**
 * Get current sync state.
 */
export function getSyncState(): SyncState {
  return { ...currentState };
}

/**
 * Subscribe to sync state changes.
 * Returns unsubscribe function.
 */
export function onSyncStateChange(callback: (state: SyncState) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Get current network state.
 */
export function getNetworkState(): NetworkState {
  return { ...networkState };
}

/**
 * Subscribe to network state changes.
 * Returns unsubscribe function.
 */
export function onNetworkStateChange(callback: (state: NetworkState) => void): () => void {
  networkListeners.add(callback);
  return () => networkListeners.delete(callback);
}

/**
 * Queue a change for syncing.
 */
export async function queueChange(path: string, action: 'create' | 'update' | 'delete'): Promise<void> {
  await addToSyncQueue(path, action);
  setState({ pendingChanges: currentState.pendingChanges + 1 });
}

/**
 * Get vault path from settings.
 */
async function getVaultPath(): Promise<string | null> {
  return getSetting<string>('vaultPath');
}

/**
 * Get git credentials from secure storage.
 */
async function getCredentials() {
  const creds = await gitService.getCredentials();
  if (!creds) {
    throw new Error('Git credentials not configured');
  }
  return creds;
}

/**
 * Get author info from settings or use default.
 */
async function getAuthor(): Promise<Author> {
  const name = await getSetting<string>('authorName') || 'Chronicle Mobile';
  const email = await getSetting<string>('authorEmail') || 'app@chronicle.local';
  return { name, email };
}

/**
 * Process the sync queue - stage and commit local changes.
 */
export async function processQueue(): Promise<void> {
  const vaultPath = await getVaultPath();
  if (!vaultPath) {
    throw new Error('Vault path not configured');
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return;
  }

  const author = await getAuthor();

  // Stage all changes
  for (const item of queue) {
    if (item.action === 'delete') {
      // For deletes, isomorphic-git handles it via status
      continue;
    }
    await gitService.add(vaultPath, item.path);
  }

  // Create commit
  const message = queue.length === 1
    ? `${queue[0].action}: ${queue[0].path}`
    : `sync: ${queue.length} changes from mobile`;

  await gitService.commit(vaultPath, message, author);
  await clearSyncQueue();
  setState({ pendingChanges: 0 });
}

/**
 * Clear the sync queue without committing.
 */
export async function discardQueue(): Promise<void> {
  await clearSyncQueue();
  setState({ pendingChanges: 0 });
}

/**
 * Perform a full sync cycle.
 */
export async function sync(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (currentState.status === 'syncing') {
    return {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: [],
      error: 'Sync already in progress',
    };
  }

  setState({ status: 'syncing', error: null });

  try {
    const vaultPath = await getVaultPath();
    if (!vaultPath) {
      throw new Error('Vault path not configured');
    }

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(vaultPath);
    if (!isRepo) {
      throw new Error('Vault is not a git repository');
    }

    const credentials = await getCredentials();

    // Process local queue first (commit local changes)
    await processQueue();

    // Pull remote changes
    const pullResult = await gitService.pull(vaultPath, credentials);
    if (!pullResult.success && pullResult.conflicts.length > 0) {
      setState({
        status: 'error',
        error: 'Merge conflicts detected',
        lastSync: new Date(),
      });
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: pullResult.conflicts,
        error: 'Merge conflicts detected',
      };
    }

    // Push local changes
    const pushResult = await gitService.push(vaultPath, credentials);
    if (!pushResult.success) {
      setState({
        status: 'error',
        error: 'Failed to push changes',
        lastSync: new Date(),
      });
      return {
        success: false,
        pulled: pullResult.updatedFiles.length,
        pushed: 0,
        conflicts: [],
        error: 'Failed to push changes',
      };
    }

    // Success
    setState({
      status: 'idle',
      error: null,
      lastSync: new Date(),
    });

    return {
      success: true,
      pulled: pullResult.updatedFiles.length,
      pushed: pushResult.ref ? 1 : 0,
      conflicts: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    setState({
      status: 'error',
      error: message,
    });
    return {
      success: false,
      pulled: 0,
      pushed: 0,
      conflicts: [],
      error: message,
    };
  }
}

/**
 * Progress callback type for clone operations.
 */
export type CloneProgressCallback = (phase: string, loaded: number, total: number | null) => void;

/**
 * Clone a repository for initial setup.
 */
export async function cloneRepo(
  url: string,
  vaultPath: string,
  credentials: Partial<GitCredentials> & { username: string },
  onProgress?: CloneProgressCallback
): Promise<void> {
  setState({ status: 'syncing', error: null });

  const fullCredentials: GitCredentials = {
    authType: 'http',
    ...credentials,
  };

  try {
    await gitService.clone(url, vaultPath, fullCredentials, onProgress);
    await gitService.storeCredentials(fullCredentials);
    setState({
      status: 'idle',
      error: null,
      lastSync: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clone failed';
    setState({
      status: 'error',
      error: message,
    });
    throw error;
  }
}

/**
 * Initialize sync state (call on app startup).
 */
export async function initSync(): Promise<void> {
  try {
    const queue = await getSyncQueue();
    setState({ pendingChanges: queue.length });

    // Initialize network listener
    await initNetworkListener();

    // Initialize background sync if enabled
    const backgroundEnabled = await getSetting<boolean>('backgroundSyncEnabled');
    if (backgroundEnabled) {
      await registerBackgroundSync();
    }
  } catch {
    // Ignore - queue may not exist yet
  }
}

// ============================================================
// Network State Management
// ============================================================

/**
 * Handle network state changes.
 * Triggers sync on reconnect if enabled.
 */
async function handleNetworkChange(state: NetInfoState): Promise<void> {
  const wasConnected = networkState.isConnected;

  networkState = {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };

  notifyNetworkListeners();

  // Check if we should sync on reconnect
  const syncOnReconnect = await getSetting<boolean>('syncOnReconnect');

  if (
    syncOnReconnect &&
    !wasConnected &&
    networkState.isConnected &&
    networkState.isInternetReachable
  ) {
    // Network reconnected - trigger sync
    console.log('[Sync] Network reconnected, triggering sync');
    pendingSyncOnReconnect = true;

    // Small delay to ensure connection is stable
    setTimeout(async () => {
      if (pendingSyncOnReconnect && networkState.isConnected) {
        pendingSyncOnReconnect = false;
        await sync();
      }
    }, 2000);
  }
}

/**
 * Initialize network state listener.
 */
export async function initNetworkListener(): Promise<void> {
  // Get initial state
  const state = await NetInfo.fetch();
  networkState = {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };

  // Subscribe to changes
  networkUnsubscribe = NetInfo.addEventListener(handleNetworkChange);
}

/**
 * Stop network listener.
 */
export function stopNetworkListener(): void {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
}

/**
 * Check if network is available.
 */
export function isNetworkAvailable(): boolean {
  return networkState.isConnected && networkState.isInternetReachable !== false;
}

// ============================================================
// Background Sync
// ============================================================

/**
 * Define the background sync task.
 * Must be called at app startup, outside of any component.
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Task running');

    // Check if we have network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      console.log('[BackgroundSync] No network, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Run sync
    const result = await sync();

    if (result.success) {
      console.log('[BackgroundSync] Completed successfully');
      return result.pulled > 0 || result.pushed > 0
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } else {
      console.log('[BackgroundSync] Failed:', result.error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('[BackgroundSync] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background sync task.
 */
export async function registerBackgroundSync(intervalMinutes?: number): Promise<void> {
  const interval = intervalMinutes ?? (await getSetting<number>('backgroundSyncInterval')) ?? 15;

  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: interval * 60, // Convert to seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[BackgroundSync] Registered with interval:', interval, 'minutes');
  } catch (error) {
    console.error('[BackgroundSync] Failed to register:', error);
    throw error;
  }
}

/**
 * Unregister background sync task.
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundSync] Unregistered');
    }
  } catch (error) {
    console.error('[BackgroundSync] Failed to unregister:', error);
  }
}

/**
 * Check if background sync is registered.
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
}

/**
 * Update background sync settings.
 */
export async function updateBackgroundSyncSettings(
  enabled: boolean,
  intervalMinutes?: number
): Promise<void> {
  await setSetting('backgroundSyncEnabled', enabled);

  if (intervalMinutes !== undefined) {
    await setSetting('backgroundSyncInterval', intervalMinutes);
  }

  if (enabled) {
    await registerBackgroundSync(intervalMinutes);
  } else {
    await unregisterBackgroundSync();
  }
}

/**
 * Update sync on reconnect setting.
 */
export async function updateSyncOnReconnect(enabled: boolean): Promise<void> {
  await setSetting('syncOnReconnect', enabled);
}

// ============================================================
// Conflict Detection
// ============================================================

/**
 * Check if a specific note has conflicts with remote.
 */
export async function checkNoteConflict(notePath: string): Promise<ConflictState> {
  const vaultPath = await getVaultPath();
  if (!vaultPath) {
    return { hasConflict: false, remoteModified: null, localModified: null };
  }

  try {
    const credentials = await getCredentials();
    return await gitService.checkRemoteModified(vaultPath, notePath, credentials);
  } catch {
    return { hasConflict: false, remoteModified: null, localModified: null };
  }
}

/**
 * Get remote version of a note for conflict resolution.
 */
export async function getRemoteNoteContent(notePath: string): Promise<string | null> {
  const vaultPath = await getVaultPath();
  if (!vaultPath) return null;

  try {
    const credentials = await getCredentials();
    return await gitService.getRemoteFileContent(vaultPath, notePath, credentials);
  } catch {
    return null;
  }
}
