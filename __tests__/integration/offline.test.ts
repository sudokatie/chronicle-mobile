/**
 * Offline scenario tests with network mocking.
 * Tests that the app functions correctly without network connectivity.
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

// Network state simulation
let isOnline = true;

const simulateOffline = () => {
  isOnline = false;
  mockGit.fetch.mockRejectedValue(new Error('Network request failed'));
  mockGit.push.mockRejectedValue(new Error('Network request failed'));
  mockGit.clone.mockRejectedValue(new Error('Network request failed'));
};

const simulateOnline = () => {
  isOnline = true;
  mockGit.fetch.mockResolvedValue(undefined);
  mockGit.push.mockResolvedValue({ ok: true, refs: { 'refs/heads/main': 'pushed' } });
  mockGit.clone.mockResolvedValue(undefined);
};

describe('Offline Scenarios', () => {
  const vaultPath = '/mock/documents/vault';

  beforeEach(() => {
    jest.clearAllMocks();
    simulateOnline();

    // Default file system mocks
    mockFs.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
    mockFs.readDirectoryAsync.mockResolvedValue([]);
    mockFs.makeDirectoryAsync.mockResolvedValue(undefined);
    mockFs.writeAsStringAsync.mockResolvedValue(undefined);
    mockFs.deleteAsync.mockResolvedValue(undefined);
    mockFs.readAsStringAsync.mockResolvedValue('# Test Note\n\nContent');

    // Default secure store mocks
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      if (key === 'git_username') return Promise.resolve('testuser');
      if (key === 'git_password') return Promise.resolve('testpass');
      if (key === 'git_auth_type') return Promise.resolve('http');
      return Promise.resolve(null);
    });

    // Default git mocks
    mockGit.currentBranch.mockResolvedValue('main');
    mockGit.resolveRef.mockResolvedValue('abc123');
    mockGit.merge.mockResolvedValue(undefined);
    mockGit.checkout.mockResolvedValue(undefined);
    mockGit.walk.mockResolvedValue([]);
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue('newsha');
    mockGit.statusMatrix.mockResolvedValue([]);

    // Default database mocks
    mockDb.getAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('settings')) {
        return Promise.resolve([
          { key: 'vaultPath', value: JSON.stringify(vaultPath) },
        ]);
      }
      return Promise.resolve([]);
    });
    mockDb.runAsync.mockResolvedValue(undefined);
    mockDb.execAsync.mockResolvedValue(undefined);
  });

  describe('Local Operations While Offline', () => {
    it('can create notes while offline', async () => {
      simulateOffline();

      const { createNote } = await import('../../src/services/notes');

      // Creating a note should work locally
      const note = await createNote('Offline Note', 'Created without network');

      expect(note).toBeDefined();
      expect(note.title).toBe('Offline Note');
      expect(note.synced).toBe(false);
      expect(mockFs.writeAsStringAsync).toHaveBeenCalled();
    });

    it('can read notes while offline', async () => {
      simulateOffline();

      mockFs.readDirectoryAsync.mockResolvedValue(['note1.md', 'note2.md']);
      mockFs.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now() / 1000,
      });

      const { listNotes } = await import('../../src/services/notes');
      const notes = await listNotes();

      expect(Array.isArray(notes)).toBe(true);
    });

    it('can update notes while offline', async () => {
      simulateOffline();

      mockFs.readDirectoryAsync.mockResolvedValue(['existing.md']);
      mockFs.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now() / 1000,
      });
      mockFs.readAsStringAsync.mockResolvedValue('# Existing Note\n\nOld content');

      const { listNotes, updateNote } = await import('../../src/services/notes');
      const notes = await listNotes();

      if (notes.length > 0) {
        const updated = await updateNote(notes[0].id, '# Existing Note\n\nNew content');
        expect(updated).toBeDefined();
        expect(mockFs.writeAsStringAsync).toHaveBeenCalled();
      }
    });

    it('can delete notes while offline', async () => {
      simulateOffline();

      mockFs.readDirectoryAsync.mockResolvedValue(['to-delete.md']);
      mockFs.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now() / 1000,
      });

      const { listNotes, deleteNote } = await import('../../src/services/notes');
      const notes = await listNotes();

      if (notes.length > 0) {
        await deleteNote(notes[0].id);
        expect(mockFs.deleteAsync).toHaveBeenCalled();
      }
    });

    it('can search notes while offline', async () => {
      simulateOffline();

      mockFs.readDirectoryAsync.mockResolvedValue(['searchable.md']);
      mockFs.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now() / 1000,
      });
      mockFs.readAsStringAsync.mockResolvedValue('# Search Test\n\nThis is searchable content');

      const { searchNotes } = await import('../../src/services/notes');
      const results = await searchNotes('searchable');

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Sync Queue While Offline', () => {
    it('queues changes for later sync', async () => {
      simulateOffline();

      const { queueChange, getSyncState } = await import('../../src/services/sync');

      await queueChange('new-note.md', 'create');
      await queueChange('updated-note.md', 'update');

      const state = getSyncState();
      expect(state.pendingChanges).toBeGreaterThan(0);
    });

    it('preserves queue across sync failures', async () => {
      simulateOffline();

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

      const { sync, getSyncState } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network');

      // State should indicate error but queue is preserved
      const state = getSyncState();
      expect(state.status).toBe('error');
    });
  });

  describe('Sync Recovery After Coming Online', () => {
    it('syncs queued changes when network restored', async () => {
      // Start offline
      simulateOffline();

      const { sync, queueChange } = await import('../../src/services/sync');

      await queueChange('offline-note.md', 'create');

      // Attempt sync while offline - should fail
      const offlineResult = await sync();
      expect(offlineResult.success).toBe(false);

      // Come back online
      simulateOnline();

      // Reset mocks for the new sync
      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        if (sql.includes('sync_queue')) {
          return Promise.resolve([
            { id: 1, path: 'offline-note.md', action: 'create', created_at: Date.now() },
          ]);
        }
        return Promise.resolve([]);
      });

      // Sync should now succeed
      const onlineResult = await sync();
      expect(onlineResult.success).toBe(true);
    });

    it('pulls remote changes after coming online', async () => {
      simulateOnline();

      mockGit.resolveRef
        .mockResolvedValueOnce('localsha')
        .mockResolvedValueOnce('remotesha');

      mockGit.walk.mockResolvedValue(['new-from-remote.md']);

      const { sync } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(true);
      expect(result.pulled).toBe(1);
    });
  });

  describe('Intermittent Connectivity', () => {
    it('handles connection drop during sync', async () => {
      // Start online but fetch fails mid-sync
      mockGit.fetch.mockRejectedValue(new Error('Connection reset'));

      const { sync, getSyncState } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection');

      const state = getSyncState();
      expect(state.status).toBe('error');
    });

    it('handles push failure after successful pull', async () => {
      mockGit.fetch.mockResolvedValue(undefined);
      mockGit.push.mockRejectedValue(new Error('Connection lost'));

      mockDb.getAllAsync.mockImplementation((sql: string) => {
        if (sql.includes('settings')) {
          return Promise.resolve([
            { key: 'vaultPath', value: JSON.stringify(vaultPath) },
          ]);
        }
        return Promise.resolve([]);
      });

      const { sync } = await import('../../src/services/sync');
      const result = await sync();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection');
    });
  });

  describe('Offline UI Indicators', () => {
    it('reports error state when offline', async () => {
      simulateOffline();

      const { sync, getSyncState } = await import('../../src/services/sync');
      await sync();

      const state = getSyncState();
      expect(state.status).toBe('error');
      expect(state.error).not.toBeNull();
    });

    it('clears error state when sync succeeds', async () => {
      // First sync offline
      simulateOffline();

      const { sync, getSyncState } = await import('../../src/services/sync');
      await sync();

      expect(getSyncState().status).toBe('error');

      // Then come online
      simulateOnline();
      await sync();

      expect(getSyncState().status).toBe('idle');
      expect(getSyncState().error).toBeNull();
    });

    it('tracks last successful sync time', async () => {
      simulateOnline();

      const { sync, getSyncState } = await import('../../src/services/sync');

      const beforeSync = Date.now();
      await sync();

      const state = getSyncState();
      expect(state.lastSync).not.toBeNull();
      expect(state.lastSync!.getTime()).toBeGreaterThanOrEqual(beforeSync);
    });
  });

  describe('Data Integrity While Offline', () => {
    it('maintains note integrity during offline edits', async () => {
      simulateOffline();

      const noteContent = `---
title: Test Note
created: 2024-01-15
---

Important content that must not be lost.

- Item 1
- Item 2
- Item 3`;

      mockFs.readAsStringAsync.mockResolvedValue(noteContent);
      mockFs.readDirectoryAsync.mockResolvedValue(['test.md']);
      mockFs.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now() / 1000,
      });

      const { listNotes } = await import('../../src/services/notes');
      const notes = await listNotes();

      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].content).toContain('Important content');
    });

    it('queues multiple operations correctly', async () => {
      simulateOffline();

      const { queueChange, getSyncState } = await import('../../src/services/sync');

      await queueChange('note1.md', 'create');
      await queueChange('note2.md', 'update');
      await queueChange('note3.md', 'delete');
      await queueChange('note1.md', 'update'); // Same file, different action

      const state = getSyncState();
      expect(state.pendingChanges).toBe(4);
    });
  });

  describe('Security While Offline', () => {
    it('maintains app lock while offline', async () => {
      simulateOffline();

      const { lock, isAppLocked, unlock } = await import('../../src/services/security');

      lock();
      expect(isAppLocked()).toBe(true);

      // Should still be able to unlock with PIN
      mockSecureStore.getItemAsync.mockResolvedValue('1234');
      const unlocked = await unlock('1234');
      expect(unlocked).toBe(true);
    });

    it('biometric auth works offline', async () => {
      simulateOffline();

      const LocalAuth = jest.requireMock('expo-local-authentication');
      LocalAuth.hasHardwareAsync.mockResolvedValue(true);
      LocalAuth.isEnrolledAsync.mockResolvedValue(true);
      LocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      const { isBiometricAvailable, checkBiometric } = await import('../../src/services/security');

      const available = await isBiometricAvailable();
      expect(available).toBe(true);

      const verified = await checkBiometric();
      expect(verified).toBe(true);
    });
  });
});
