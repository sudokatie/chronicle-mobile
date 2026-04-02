// Sync service tests with mocked dependencies

// Mock git service
const mockIsGitRepo = jest.fn();
const mockGetCredentials = jest.fn();
const mockPull = jest.fn();
const mockPush = jest.fn();
const mockAdd = jest.fn();
const mockCommit = jest.fn();
const mockClone = jest.fn();
const mockStoreCredentials = jest.fn();

jest.mock('../../src/services/git', () => ({
  isGitRepo: () => mockIsGitRepo(),
  getCredentials: () => mockGetCredentials(),
  pull: (...args: unknown[]) => mockPull(...args),
  push: (...args: unknown[]) => mockPush(...args),
  add: (...args: unknown[]) => mockAdd(...args),
  commit: (...args: unknown[]) => mockCommit(...args),
  clone: (...args: unknown[]) => mockClone(...args),
  storeCredentials: (...args: unknown[]) => mockStoreCredentials(...args),
}));

// Mock storage service
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockGetSyncQueue = jest.fn();
const mockClearSyncQueue = jest.fn();
const mockAddToSyncQueue = jest.fn();

jest.mock('../../src/services/storage', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
  getSyncQueue: () => mockGetSyncQueue(),
  clearSyncQueue: () => mockClearSyncQueue(),
  addToSyncQueue: (...args: unknown[]) => mockAddToSyncQueue(...args),
}));

import {
  getSyncState,
  onSyncStateChange,
  queueChange,
  processQueue,
  discardQueue,
  sync,
  cloneRepo,
  initSync,
} from '../../src/services/sync';

describe('sync service', () => {
  const mockCredentials = { username: 'testuser', password: 'testpass', authType: 'http' as const };
  const mockVaultPath = '/mock/vault';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'vaultPath') return Promise.resolve(mockVaultPath);
      if (key === 'authorName') return Promise.resolve('Test User');
      if (key === 'authorEmail') return Promise.resolve('test@example.com');
      return Promise.resolve(null);
    });
    mockGetCredentials.mockResolvedValue(mockCredentials);
    mockIsGitRepo.mockResolvedValue(true);
    mockGetSyncQueue.mockResolvedValue([]);
    mockClearSyncQueue.mockResolvedValue(undefined);
    mockAddToSyncQueue.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue(undefined);
    mockCommit.mockResolvedValue('abc123');
    mockPull.mockResolvedValue({ success: true, updatedFiles: [], conflicts: [] });
    mockPush.mockResolvedValue({ success: true, ref: 'main' });
  });

  describe('getSyncState', () => {
    it('returns current sync state', () => {
      const state = getSyncState();

      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('lastSync');
      expect(state).toHaveProperty('pendingChanges');
      expect(state).toHaveProperty('error');
    });

    it('returns a copy of state, not reference', () => {
      const state1 = getSyncState();
      const state2 = getSyncState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('has correct initial state shape', () => {
      const state = getSyncState();

      expect(['idle', 'syncing', 'error']).toContain(state.status);
      expect(typeof state.pendingChanges).toBe('number');
    });
  });

  describe('onSyncStateChange', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = onSyncStateChange(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('does not call callback immediately on subscribe', () => {
      const callback = jest.fn();
      const unsubscribe = onSyncStateChange(callback);

      expect(callback).not.toHaveBeenCalled();
      unsubscribe();
    });

    it('allows multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsub1 = onSyncStateChange(callback1);
      const unsub2 = onSyncStateChange(callback2);

      unsub1();
      unsub2();
    });
  });

  describe('queueChange', () => {
    it('adds item to sync queue', async () => {
      await queueChange('test.md', 'create');

      expect(mockAddToSyncQueue).toHaveBeenCalledWith('test.md', 'create');
    });

    it('increments pending changes count', async () => {
      const initialState = getSyncState();
      const initialPending = initialState.pendingChanges;

      await queueChange('test.md', 'update');

      const newState = getSyncState();
      expect(newState.pendingChanges).toBe(initialPending + 1);
    });

    it('handles different action types', async () => {
      await queueChange('create.md', 'create');
      await queueChange('update.md', 'update');
      await queueChange('delete.md', 'delete');

      expect(mockAddToSyncQueue).toHaveBeenCalledTimes(3);
    });
  });

  describe('processQueue', () => {
    it('stages and commits queued changes', async () => {
      mockGetSyncQueue.mockResolvedValue([
        { id: 1, path: 'note1.md', action: 'create', created_at: Date.now() },
        { id: 2, path: 'note2.md', action: 'update', created_at: Date.now() },
      ]);

      await processQueue();

      expect(mockAdd).toHaveBeenCalledTimes(2);
      expect(mockCommit).toHaveBeenCalled();
      expect(mockClearSyncQueue).toHaveBeenCalled();
    });

    it('creates appropriate commit message for single change', async () => {
      mockGetSyncQueue.mockResolvedValue([
        { id: 1, path: 'note.md', action: 'create', created_at: Date.now() },
      ]);

      await processQueue();

      expect(mockCommit).toHaveBeenCalledWith(
        mockVaultPath,
        'create: note.md',
        expect.any(Object)
      );
    });

    it('creates batch commit message for multiple changes', async () => {
      mockGetSyncQueue.mockResolvedValue([
        { id: 1, path: 'a.md', action: 'create', created_at: Date.now() },
        { id: 2, path: 'b.md', action: 'update', created_at: Date.now() },
        { id: 3, path: 'c.md', action: 'delete', created_at: Date.now() },
      ]);

      await processQueue();

      expect(mockCommit).toHaveBeenCalledWith(
        mockVaultPath,
        'sync: 3 changes from mobile',
        expect.any(Object)
      );
    });

    it('skips staging for delete actions', async () => {
      mockGetSyncQueue.mockResolvedValue([
        { id: 1, path: 'deleted.md', action: 'delete', created_at: Date.now() },
      ]);

      await processQueue();

      // Delete actions should not call add
      expect(mockAdd).not.toHaveBeenCalledWith(mockVaultPath, 'deleted.md');
    });

    it('does nothing when queue is empty', async () => {
      mockGetSyncQueue.mockResolvedValue([]);

      await processQueue();

      expect(mockAdd).not.toHaveBeenCalled();
      expect(mockCommit).not.toHaveBeenCalled();
    });

    it('throws when vault path not configured', async () => {
      mockGetSetting.mockResolvedValue(null);

      await expect(processQueue()).rejects.toThrow('Vault path not configured');
    });

    it('resets pending changes count on success', async () => {
      mockGetSyncQueue.mockResolvedValue([
        { id: 1, path: 'note.md', action: 'create', created_at: Date.now() },
      ]);

      await processQueue();

      const state = getSyncState();
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe('discardQueue', () => {
    it('clears sync queue without committing', async () => {
      await discardQueue();

      expect(mockClearSyncQueue).toHaveBeenCalled();
      expect(mockCommit).not.toHaveBeenCalled();
    });

    it('resets pending changes count', async () => {
      await queueChange('test.md', 'create');
      await discardQueue();

      const state = getSyncState();
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe('sync', () => {
    it('performs full sync cycle', async () => {
      const result = await sync();

      expect(result.success).toBe(true);
      expect(mockPull).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });

    it('processes local queue before pulling', async () => {
      mockGetSyncQueue.mockResolvedValueOnce([
        { id: 1, path: 'local.md', action: 'create', created_at: Date.now() },
      ]).mockResolvedValue([]);

      await sync();

      // Verify queue was processed (commit called) before pull
      expect(mockCommit).toHaveBeenCalled();
    });

    it('returns pulled and pushed counts', async () => {
      mockPull.mockResolvedValue({
        success: true,
        updatedFiles: ['file1.md', 'file2.md'],
        conflicts: [],
      });

      const result = await sync();

      expect(result.pulled).toBe(2);
    });

    it('prevents concurrent syncs', async () => {
      // Start first sync
      const syncPromise1 = sync();

      // Attempt second sync immediately
      const result2 = await sync();

      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Sync already in progress');

      await syncPromise1;
    });

    it('handles pull conflicts', async () => {
      mockPull.mockResolvedValue({
        success: false,
        updatedFiles: [],
        conflicts: ['conflicted.md'],
      });

      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.conflicts).toContain('conflicted.md');
      expect(result.error).toBe('Merge conflicts detected');
    });

    it('handles push failures', async () => {
      mockPush.mockResolvedValue({ success: false, ref: '' });

      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to push changes');
    });

    it('fails when vault is not a git repo', async () => {
      mockIsGitRepo.mockResolvedValue(false);

      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vault is not a git repository');
    });

    it('fails when credentials not configured', async () => {
      mockGetCredentials.mockResolvedValue(null);

      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Git credentials not configured');
    });

    it('updates sync state throughout cycle', async () => {
      const states: string[] = [];
      const unsubscribe = onSyncStateChange((state) => {
        states.push(state.status);
      });

      await sync();

      expect(states).toContain('syncing');
      expect(states).toContain('idle');

      unsubscribe();
    });

    it('handles unexpected errors', async () => {
      mockPull.mockRejectedValue(new Error('Network error'));

      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('updates lastSync timestamp on success', async () => {
      const beforeSync = Date.now();

      await sync();

      const state = getSyncState();
      expect(state.lastSync).not.toBeNull();
      expect(state.lastSync!.getTime()).toBeGreaterThanOrEqual(beforeSync);
    });
  });

  describe('cloneRepo', () => {
    beforeEach(() => {
      mockClone.mockResolvedValue(undefined);
      mockStoreCredentials.mockResolvedValue(undefined);
    });

    it('clones repository and stores credentials', async () => {
      await cloneRepo('https://github.com/user/repo.git', mockVaultPath, mockCredentials);

      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        mockVaultPath,
        mockCredentials
      );
      expect(mockStoreCredentials).toHaveBeenCalledWith(mockCredentials);
    });

    it('sets syncing state during clone', async () => {
      const states: string[] = [];
      const unsubscribe = onSyncStateChange((state) => {
        states.push(state.status);
      });

      await cloneRepo('https://github.com/user/repo.git', mockVaultPath, mockCredentials);

      expect(states).toContain('syncing');
      unsubscribe();
    });

    it('sets idle state on success', async () => {
      await cloneRepo('https://github.com/user/repo.git', mockVaultPath, mockCredentials);

      const state = getSyncState();
      expect(state.status).toBe('idle');
    });

    it('sets error state on failure', async () => {
      mockClone.mockRejectedValue(new Error('Clone failed'));

      await expect(
        cloneRepo('https://github.com/user/repo.git', mockVaultPath, mockCredentials)
      ).rejects.toThrow('Clone failed');

      const state = getSyncState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Clone failed');
    });
  });

  describe('initSync', () => {
    it('initializes pending changes from queue', async () => {
      mockGetSyncQueue.mockResolvedValue([
        { id: 1, path: 'a.md', action: 'create', created_at: Date.now() },
        { id: 2, path: 'b.md', action: 'update', created_at: Date.now() },
      ]);

      await initSync();

      const state = getSyncState();
      expect(state.pendingChanges).toBe(2);
    });

    it('handles queue read errors gracefully', async () => {
      mockGetSyncQueue.mockRejectedValue(new Error('DB error'));

      await expect(initSync()).resolves.not.toThrow();
    });
  });
});
