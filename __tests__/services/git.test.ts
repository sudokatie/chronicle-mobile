// Git service tests with mocked isomorphic-git

// Mock isomorphic-git before importing service
const mockClone = jest.fn();
const mockFetch = jest.fn();
const mockPull = jest.fn();
const mockPush = jest.fn();
const mockAdd = jest.fn();
const mockCommit = jest.fn();
const mockStatusMatrix = jest.fn();
const mockCurrentBranch = jest.fn();
const mockResolveRef = jest.fn();
const mockMerge = jest.fn();
const mockCheckout = jest.fn();
const mockInit = jest.fn();
const mockAddRemote = jest.fn();
const mockWalk = jest.fn();

jest.mock('isomorphic-git', () => ({
  clone: (...args: unknown[]) => mockClone(...args),
  fetch: (...args: unknown[]) => mockFetch(...args),
  push: (...args: unknown[]) => mockPush(...args),
  add: (...args: unknown[]) => mockAdd(...args),
  commit: (...args: unknown[]) => mockCommit(...args),
  statusMatrix: (...args: unknown[]) => mockStatusMatrix(...args),
  currentBranch: (...args: unknown[]) => mockCurrentBranch(...args),
  resolveRef: (...args: unknown[]) => mockResolveRef(...args),
  merge: (...args: unknown[]) => mockMerge(...args),
  checkout: (...args: unknown[]) => mockCheckout(...args),
  init: (...args: unknown[]) => mockInit(...args),
  addRemote: (...args: unknown[]) => mockAddRemote(...args),
  walk: (...args: unknown[]) => mockWalk(...args),
  TREE: jest.fn((opts) => opts),
}));

jest.mock('isomorphic-git/http/web', () => ({}));

// Mock expo-file-system
const mockFsReadAsStringAsync = jest.fn();
const mockFsWriteAsStringAsync = jest.fn();
const mockFsDeleteAsync = jest.fn();
const mockFsReadDirectoryAsync = jest.fn();
const mockFsMakeDirectoryAsync = jest.fn();
const mockFsGetInfoAsync = jest.fn();

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  readAsStringAsync: (...args: unknown[]) => mockFsReadAsStringAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockFsWriteAsStringAsync(...args),
  deleteAsync: (...args: unknown[]) => mockFsDeleteAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockFsReadDirectoryAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockFsMakeDirectoryAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockFsGetInfoAsync(...args),
}));

// Mock expo-secure-store
const mockSecureStoreGet = jest.fn();
const mockSecureStoreSet = jest.fn();
const mockSecureStoreDelete = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockSecureStoreGet(...args),
  setItemAsync: (...args: unknown[]) => mockSecureStoreSet(...args),
  deleteItemAsync: (...args: unknown[]) => mockSecureStoreDelete(...args),
}));

import * as gitService from '../../src/services/git';

describe('git service', () => {
  const mockCredentials = { username: 'testuser', password: 'testpass' };
  const mockDir = '/mock/vault';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFsGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
    mockFsReadDirectoryAsync.mockResolvedValue([]);
    mockFsMakeDirectoryAsync.mockResolvedValue(undefined);
  });

  describe('storeCredentials', () => {
    it('stores username and password securely', async () => {
      mockSecureStoreSet.mockResolvedValue(undefined);

      await gitService.storeCredentials(mockCredentials);

      expect(mockSecureStoreSet).toHaveBeenCalledWith('git_username', 'testuser');
      expect(mockSecureStoreSet).toHaveBeenCalledWith('git_password', 'testpass');
    });

    it('handles missing password', async () => {
      mockSecureStoreSet.mockResolvedValue(undefined);

      await gitService.storeCredentials({ username: 'user' });

      expect(mockSecureStoreSet).toHaveBeenCalledWith('git_username', 'user');
      expect(mockSecureStoreSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCredentials', () => {
    it('retrieves stored credentials', async () => {
      mockSecureStoreGet.mockImplementation((key: string) => {
        if (key === 'git_username') return Promise.resolve('storeduser');
        if (key === 'git_password') return Promise.resolve('storedpass');
        return Promise.resolve(null);
      });

      const creds = await gitService.getCredentials();

      expect(creds).toEqual({ username: 'storeduser', password: 'storedpass' });
    });

    it('returns null when no credentials stored', async () => {
      mockSecureStoreGet.mockResolvedValue(null);

      const creds = await gitService.getCredentials();

      expect(creds).toBeNull();
    });
  });

  describe('clearCredentials', () => {
    it('removes stored credentials', async () => {
      mockSecureStoreDelete.mockResolvedValue(undefined);

      await gitService.clearCredentials();

      expect(mockSecureStoreDelete).toHaveBeenCalledWith('git_username');
      expect(mockSecureStoreDelete).toHaveBeenCalledWith('git_password');
    });
  });

  describe('clone', () => {
    it('clones repository to specified directory', async () => {
      mockClone.mockResolvedValue(undefined);

      await gitService.clone('https://github.com/user/repo.git', mockDir, mockCredentials);

      expect(mockClone).toHaveBeenCalledWith(
        expect.objectContaining({
          dir: mockDir,
          url: 'https://github.com/user/repo.git',
          depth: 1,
          singleBranch: true,
        })
      );
    });

    it('creates target directory before cloning', async () => {
      mockClone.mockResolvedValue(undefined);

      await gitService.clone('https://github.com/user/repo.git', mockDir, mockCredentials);

      expect(mockFsMakeDirectoryAsync).toHaveBeenCalledWith(mockDir, { intermediates: true });
    });

    it('passes auth callback to clone', async () => {
      mockClone.mockResolvedValue(undefined);

      await gitService.clone('https://github.com/user/repo.git', mockDir, mockCredentials);

      const cloneOptions = mockClone.mock.calls[0][0];
      expect(cloneOptions.onAuth).toBeDefined();
      
      const auth = cloneOptions.onAuth();
      expect(auth.username).toBe('testuser');
      expect(auth.password).toBe('testpass');
    });

    it('propagates clone errors', async () => {
      mockClone.mockRejectedValue(new Error('Authentication failed'));

      await expect(
        gitService.clone('https://github.com/user/repo.git', mockDir, mockCredentials)
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('pull', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(undefined);
      mockCurrentBranch.mockResolvedValue('main');
      mockResolveRef.mockResolvedValue('abc123');
      mockMerge.mockResolvedValue(undefined);
      mockCheckout.mockResolvedValue(undefined);
      mockWalk.mockResolvedValue([]);
    });

    it('fetches and merges remote changes', async () => {
      const result = await gitService.pull(mockDir, mockCredentials);

      expect(mockFetch).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('returns already up to date when refs match', async () => {
      mockResolveRef.mockResolvedValue('same-sha');

      const result = await gitService.pull(mockDir, mockCredentials);

      expect(result.success).toBe(true);
      expect(result.updatedFiles).toEqual([]);
    });

    it('returns list of updated files', async () => {
      mockResolveRef
        .mockResolvedValueOnce('local-sha')
        .mockResolvedValueOnce('remote-sha');
      mockWalk.mockResolvedValue(['file1.md', 'file2.md']);

      const result = await gitService.pull(mockDir, mockCredentials);

      expect(result.updatedFiles).toEqual(['file1.md', 'file2.md']);
    });

    it('handles no branch scenario', async () => {
      mockCurrentBranch.mockResolvedValue(null);

      const result = await gitService.pull(mockDir, mockCredentials);

      expect(result.success).toBe(false);
    });

    it('detects merge conflicts', async () => {
      mockResolveRef
        .mockResolvedValueOnce('local-sha')
        .mockResolvedValueOnce('remote-sha');
      mockMerge.mockRejectedValue(new Error('conflict detected'));

      const result = await gitService.pull(mockDir, mockCredentials);

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('push', () => {
    it('pushes local commits to remote', async () => {
      mockPush.mockResolvedValue({
        ok: true,
        refs: { 'refs/heads/main': 'pushed' },
      });

      const result = await gitService.push(mockDir, mockCredentials);

      expect(mockPush).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('reports push failures', async () => {
      mockPush.mockResolvedValue({
        error: 'rejected',
        refs: {},
      });

      const result = await gitService.push(mockDir, mockCredentials);

      expect(result.success).toBe(false);
    });

    it('handles master branch', async () => {
      mockPush.mockResolvedValue({
        ok: true,
        refs: { 'refs/heads/master': 'pushed' },
      });

      const result = await gitService.push(mockDir, mockCredentials);

      expect(result.ref).toBe('pushed');
    });
  });

  describe('status', () => {
    it('returns file statuses from status matrix', async () => {
      mockStatusMatrix.mockResolvedValue([
        ['new-file.md', 0, 2, 0],      // untracked
        ['added-file.md', 0, 2, 2],    // added
        ['modified.md', 1, 2, 2],      // modified
        ['deleted.md', 1, 0, 0],       // deleted
        ['unchanged.md', 1, 1, 1],     // unchanged (should be filtered)
      ]);

      const statuses = await gitService.status(mockDir);

      expect(statuses).toContainEqual({ path: 'new-file.md', status: 'untracked' });
      expect(statuses).toContainEqual({ path: 'added-file.md', status: 'added' });
      expect(statuses).toContainEqual({ path: 'modified.md', status: 'modified' });
      expect(statuses).toContainEqual({ path: 'deleted.md', status: 'deleted' });
      expect(statuses.find(s => s.path === 'unchanged.md')).toBeUndefined();
    });

    it('filters out .git directory', async () => {
      mockStatusMatrix.mockResolvedValue([
        ['.git/config', 1, 2, 2],
        ['.gitignore', 0, 2, 0],
      ]);

      const statuses = await gitService.status(mockDir);

      expect(statuses.find(s => s.path.startsWith('.git/'))).toBeUndefined();
    });
  });

  describe('add', () => {
    it('stages file for commit', async () => {
      mockAdd.mockResolvedValue(undefined);

      await gitService.add(mockDir, 'file.md');

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          dir: mockDir,
          filepath: 'file.md',
        })
      );
    });
  });

  describe('commit', () => {
    it('creates commit with message and author', async () => {
      mockCommit.mockResolvedValue('new-sha-123');

      const sha = await gitService.commit(mockDir, 'Test commit', {
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(sha).toBe('new-sha-123');
      expect(mockCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          dir: mockDir,
          message: 'Test commit',
          author: { name: 'Test User', email: 'test@example.com' },
        })
      );
    });
  });

  describe('hasConflicts', () => {
    it('detects conflict markers in files', async () => {
      mockFsGetInfoAsync.mockResolvedValue({ exists: true });
      mockStatusMatrix.mockResolvedValue([['conflict.md', 1, 2, 2]]);
      mockFsReadAsStringAsync.mockResolvedValue(`
Some content
<<<<<<< HEAD
Local changes
=======
Remote changes
>>>>>>> remote
      `);

      const hasConflict = await gitService.hasConflicts(mockDir);

      expect(hasConflict).toBe(true);
    });

    it('returns false when no conflicts', async () => {
      mockFsGetInfoAsync.mockResolvedValue({ exists: true });
      mockStatusMatrix.mockResolvedValue([['clean.md', 1, 2, 2]]);
      mockFsReadAsStringAsync.mockResolvedValue('Clean content with no markers');

      const hasConflict = await gitService.hasConflicts(mockDir);

      expect(hasConflict).toBe(false);
    });

    it('returns false when index does not exist', async () => {
      mockFsGetInfoAsync.mockResolvedValue({ exists: false });

      const hasConflict = await gitService.hasConflicts(mockDir);

      expect(hasConflict).toBe(false);
    });
  });

  describe('resolveConflict', () => {
    it('writes resolved content and stages file', async () => {
      mockFsWriteAsStringAsync.mockResolvedValue(undefined);
      mockAdd.mockResolvedValue(undefined);

      await gitService.resolveConflict(mockDir, 'conflict.md', 'Resolved content');

      expect(mockFsWriteAsStringAsync).toHaveBeenCalledWith(
        `${mockDir}/conflict.md`,
        'Resolved content'
      );
      expect(mockAdd).toHaveBeenCalled();
    });
  });

  describe('getCurrentBranch', () => {
    it('returns current branch name', async () => {
      mockCurrentBranch.mockResolvedValue('main');

      const branch = await gitService.getCurrentBranch(mockDir);

      expect(branch).toBe('main');
    });

    it('returns null for detached HEAD', async () => {
      mockCurrentBranch.mockResolvedValue(undefined);

      const branch = await gitService.getCurrentBranch(mockDir);

      expect(branch).toBeNull();
    });

    it('handles errors gracefully', async () => {
      mockCurrentBranch.mockRejectedValue(new Error('Not a git repo'));

      const branch = await gitService.getCurrentBranch(mockDir);

      expect(branch).toBeNull();
    });
  });

  describe('isGitRepo', () => {
    it('returns true when .git directory exists', async () => {
      mockFsGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });

      const isRepo = await gitService.isGitRepo(mockDir);

      expect(isRepo).toBe(true);
    });

    it('returns false when .git directory does not exist', async () => {
      mockFsGetInfoAsync.mockResolvedValue({ exists: false });

      const isRepo = await gitService.isGitRepo(mockDir);

      expect(isRepo).toBe(false);
    });

    it('returns false when .git is a file not directory', async () => {
      mockFsGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: false });

      const isRepo = await gitService.isGitRepo(mockDir);

      expect(isRepo).toBe(false);
    });
  });

  describe('init', () => {
    it('initializes new git repository', async () => {
      mockInit.mockResolvedValue(undefined);

      await gitService.init(mockDir);

      expect(mockFsMakeDirectoryAsync).toHaveBeenCalledWith(mockDir, { intermediates: true });
      expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ dir: mockDir }));
    });
  });

  describe('setRemote', () => {
    it('adds remote to repository', async () => {
      mockAddRemote.mockResolvedValue(undefined);

      await gitService.setRemote(mockDir, 'origin', 'https://github.com/user/repo.git');

      expect(mockAddRemote).toHaveBeenCalledWith(
        expect.objectContaining({
          dir: mockDir,
          remote: 'origin',
          url: 'https://github.com/user/repo.git',
        })
      );
    });
  });
});
