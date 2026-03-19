import { SyncState, SyncResult, Author } from '../types';
import * as gitService from './git';
import {
  getSetting,
  getSyncQueue,
  clearSyncQueue,
  addToSyncQueue,
} from './storage';

// Sync state
let currentState: SyncState = {
  status: 'idle',
  lastSync: null,
  pendingChanges: 0,
  error: null,
};

// State change listeners
const listeners: Set<(state: SyncState) => void> = new Set();

/**
 * Notify all listeners of state change.
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener(currentState);
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
 * Clone a repository for initial setup.
 */
export async function cloneRepo(
  url: string,
  vaultPath: string,
  credentials: { username: string; password?: string }
): Promise<void> {
  setState({ status: 'syncing', error: null });

  try {
    await gitService.clone(url, vaultPath, credentials);
    await gitService.storeCredentials(credentials);
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
  } catch {
    // Ignore - queue may not exist yet
  }
}
