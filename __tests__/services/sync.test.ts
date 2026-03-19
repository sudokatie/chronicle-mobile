import {
  getSyncState,
  onSyncStateChange,
} from '../../src/services/sync';

// Mock git service
jest.mock('../../src/services/git', () => ({
  isGitRepo: jest.fn().mockResolvedValue(true),
  getCredentials: jest.fn().mockResolvedValue({ username: 'test', password: 'test' }),
  pull: jest.fn().mockResolvedValue({ success: true, updatedFiles: [], conflicts: [] }),
  push: jest.fn().mockResolvedValue({ success: true, ref: 'main' }),
  add: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue('abc123'),
}));

// Mock storage service
jest.mock('../../src/services/storage', () => ({
  getSetting: jest.fn().mockResolvedValue('/path/to/vault'),
  setSetting: jest.fn().mockResolvedValue(undefined),
  getSyncQueue: jest.fn().mockResolvedValue([]),
  clearSyncQueue: jest.fn().mockResolvedValue(undefined),
  addToSyncQueue: jest.fn().mockResolvedValue(undefined),
}));

describe('sync service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  describe('onSyncStateChange', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = onSyncStateChange(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });

    it('does not call callback immediately on subscribe', () => {
      const callback = jest.fn();
      const unsubscribe = onSyncStateChange(callback);
      
      expect(callback).not.toHaveBeenCalled();
      
      unsubscribe();
    });
  });
});
