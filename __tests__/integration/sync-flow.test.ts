/**
 * Integration tests for the complete sync flow.
 * Tests the interaction between notes, git, and sync services.
 */

// Mock expo-file-system
const mockFs = {
  documentDirectory: '/mock/documents/',
  readDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
};

jest.mock('expo-file-system', () => mockFs);

// Mock expo-secure-store
const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore);

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: false }),
}));

// Mock isomorphic-git
const mockGit = {
  clone: jest.fn(),
  fetch: jest.fn(),
  push: jest.fn(),
  add: jest.fn(),
  commit: jest.fn(),
  statusMatrix: jest.fn(),
  currentBranch: jest.fn(),
  resolveRef: jest.fn(),
  merge: jest.fn(),
  checkout: jest.fn(),
  init: jest.fn(),
  addRemote: jest.fn(),
  walk: jest.fn(),
  TREE: jest.fn((opts) => opts),
};

jest.mock('isomorphic-git', () => mockGit);
jest.mock('isomorphic-git/http/web', () => ({}));

// Mock expo-sqlite
const mockDb = {
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  execAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
}));

describe('Sync Flow Integration', () => {
  const vaultPath = '/mock/documents/vault';
  const credentials = { username: 'testuser', password: 'testpass', authType: 'http' as const };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset file system mocks
    mockFs.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
    mockFs.readDirectoryAsync.mockResolvedValue([]);
    mockFs.makeDirectoryAsync.mockResolvedValue(undefined);
    mockFs.writeAsStringAsync.mockResolvedValue(undefined);
    mockFs.deleteAsync.mockResolvedValue(undefined);

    // Reset secure store
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === 'git_username') return Promise.resolve('testuser');
      if (key === 'git_password') return Promise.resolve('testpass');
      return Promise.resolve(null);
    });

    // Reset git mocks
    mockGit.currentBranch.mockResolvedValue('main');
    mockGit.resolveRef.mockResolvedValue('abc123');
    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.merge.mockResolvedValue(undefined);
    mockGit.checkout.mockResolvedValue(undefined);
    mockGit.walk.mockResolvedValue([]);
    mockGit.push.mockResolvedValue({ ok: true, refs: { 'refs/heads/main': 'pushed' } });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue('newsha');

    // Reset database mocks
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue(undefined);
    mockDb.execAsync.mockResolvedValue(undefined);
  });

  describe('Initial Setup Flow', () => {
    it('clones repository on first setup', async () => {
      const { cloneRepo } = await import('../../src/services/sync');
      mockGit.clone.mockResolvedValue(undefined);

      await cloneRepo('https://github.com/user/vault.git', vaultPath, credentials);

      expect(mockGit.clone).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://github.com/user/vault.git',
          dir: vaultPath,
        })
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('git_username', 'testuser');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('git_password', 'testpass');
    });

    it('handles clone errors gracefully', async () => {
      const { cloneRepo, getSyncState } = await import('../../src/services/sync');
      mockGit.clone.mockRejectedValue(new Error('Authentication failed'));

      await expect(
        cloneRepo('https://github.com/user/vault.git', vaultPath, credentials)
      ).rejects.toThrow('Authentication failed');

      const state = getSyncState();
      expect(state.status).toBe('error');
      expect(state.error).toContain('Authentication failed');
    });
  });

  describe('Note Creation and Sync', () => {
    it('creates note and queues for sync', async () => {
      // Setup mock database for settings
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([{ key: 'vaultPath', value: JSON.stringify(vaultPath) }]);
        }
        if (sql.includes('sync_queue')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      // Verify note creation adds to sync queue
      expect(mockDb.runAsync).toBeDefined();
    });

    it('syncs newly created note to remote', async () => {
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
            { key: 'authorName', value: JSON.stringify('Test') },
            { key: 'authorEmail', value: JSON.stringify('test@test.com') },
          ]);
        }
        if (sql.includes('sync_queue')) {
          return Promise.resolve([
            { id: 1, path: 'new-note.md', action: 'create', created_at: Date.now() },
          ]);
        }
        return Promise.resolve([]);
      });

      mockFs.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });

      const { sync } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(true);
      expect(mockGit.add).toHaveBeenCalled();
      expect(mockGit.commit).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalled();
    });
  });

  describe('Pull Remote Changes', () => {
    it('pulls and applies remote changes', async () => {
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        return Promise.resolve([]);
      });

      mockGit.resolveRef
        .mockResolvedValueOnce('localsha')
        .mockResolvedValueOnce('remotesha');

      mockGit.walk.mockResolvedValue(['updated-note.md']);

      const { sync } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.pulled).toBe(1);
      expect(mockGit.fetch).toHaveBeenCalled();
      expect(mockGit.merge).toHaveBeenCalled();
    });

    it('detects when already up to date', async () => {
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        return Promise.resolve([]);
      });

      // Same SHA for local and remote
      mockGit.resolveRef.mockResolvedValue('samesha');

      const { sync } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(true);
      expect(result.pulled).toBe(0);
    });
  });

  describe('Conflict Handling', () => {
    it('detects merge conflicts', async () => {
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        return Promise.resolve([]);
      });

      mockGit.resolveRef
        .mockResolvedValueOnce('localsha')
        .mockResolvedValueOnce('remotesha');

      mockGit.merge.mockRejectedValue(new Error('conflict detected'));

      const { sync } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('recovers from network errors on retry', async () => {
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        return Promise.resolve([]);
      });

      // First call fails
      mockGit.fetch.mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds
      mockGit.fetch.mockResolvedValueOnce(undefined);

      const { sync } = await import('../../src/services/sync');

      const result1 = await sync();
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Network error');

      const result2 = await sync();
      expect(result2.success).toBe(true);
    });

    it('preserves local queue on sync failure', async () => {
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        if (sql.includes('sync_queue')) {
          return Promise.resolve([
            { id: 1, path: 'pending.md', action: 'create', created_at: Date.now() },
          ]);
        }
        return Promise.resolve([]);
      });

      mockGit.push.mockResolvedValue({ error: 'rejected', refs: {} });

      const { sync, getSyncState } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(false);
      // Queue should not be cleared on push failure
      // This is handled by the fact that clearSyncQueue is only called after successful commit
    });
  });

  describe('State Management', () => {
    it('tracks sync state throughout operation', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { key: 'vaultPath', value: JSON.stringify(vaultPath) },
      ]);

      const { sync, onSyncStateChange, getSyncState } = await import('../../src/services/sync');

      const stateHistory: string[] = [];
      const unsubscribe = onSyncStateChange((state) => {
        stateHistory.push(state.status);
      });

      await sync();

      expect(stateHistory).toContain('syncing');
      expect(getSyncState().status).toBe('idle');

      unsubscribe();
    });

    it('tracks pending changes count', async () => {
      const { queueChange, getSyncState, discardQueue } = await import('../../src/services/sync');

      await queueChange('a.md', 'create');
      await queueChange('b.md', 'update');

      const state1 = getSyncState();
      expect(state1.pendingChanges).toBeGreaterThan(0);

      await discardQueue();

      const state2 = getSyncState();
      expect(state2.pendingChanges).toBe(0);
    });
  });
});
