import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import {
  GitCredentials,
  FileStatus,
  PullResult,
  PushResult,
  Author,
  ConflictState,
} from '../types';

/**
 * File system wrapper for isomorphic-git.
 * Adapts expo-file-system to the fs interface isomorphic-git expects.
 */
const fs = {
  promises: {
    readFile: async (filepath: string, options?: { encoding?: string }) => {
      const content = await FileSystem.readAsStringAsync(filepath);
      if (options?.encoding === 'utf8') {
        return content;
      }
      // Return as Uint8Array for binary
      const encoder = new TextEncoder();
      return encoder.encode(content);
    },

    writeFile: async (filepath: string, data: string | Uint8Array) => {
      const content = typeof data === 'string' ? data : new TextDecoder().decode(data);
      // Ensure directory exists
      const dir = filepath.substring(0, filepath.lastIndexOf('/'));
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      await FileSystem.writeAsStringAsync(filepath, content);
    },

    unlink: async (filepath: string) => {
      await FileSystem.deleteAsync(filepath, { idempotent: true });
    },

    readdir: async (dirpath: string) => {
      try {
        return await FileSystem.readDirectoryAsync(dirpath);
      } catch {
        return [];
      }
    },

    mkdir: async (dirpath: string) => {
      await FileSystem.makeDirectoryAsync(dirpath, { intermediates: true });
    },

    rmdir: async (dirpath: string) => {
      await FileSystem.deleteAsync(dirpath, { idempotent: true });
    },

    stat: async (filepath: string) => {
      const info = await FileSystem.getInfoAsync(filepath);
      if (!info.exists) {
        const error = new Error(`ENOENT: no such file or directory, stat '${filepath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return {
        isFile: () => !info.isDirectory,
        isDirectory: () => info.isDirectory,
        isSymbolicLink: () => false,
        size: info.size || 0,
        mtimeMs: info.modificationTime ? info.modificationTime * 1000 : Date.now(),
        mode: info.isDirectory ? 0o40755 : 0o100644,
      };
    },

    lstat: async (filepath: string) => {
      return fs.promises.stat(filepath);
    },

    readlink: async (filepath: string) => {
      // No symlinks in expo-file-system
      return filepath;
    },

    symlink: async () => {
      // No-op for expo
    },

    chmod: async () => {
      // No-op for expo
    },
  },
};

// Credential storage keys
const CRED_USERNAME_KEY = 'git_username';
const CRED_PASSWORD_KEY = 'git_password';

/**
 * Store git credentials securely.
 */
export async function storeCredentials(credentials: GitCredentials): Promise<void> {
  await SecureStore.setItemAsync(CRED_USERNAME_KEY, credentials.username);
  if (credentials.password) {
    await SecureStore.setItemAsync(CRED_PASSWORD_KEY, credentials.password);
  }
}

/**
 * Get stored git credentials.
 */
export async function getCredentials(): Promise<GitCredentials | null> {
  const username = await SecureStore.getItemAsync(CRED_USERNAME_KEY);
  if (!username) return null;

  const password = await SecureStore.getItemAsync(CRED_PASSWORD_KEY);
  return { username, password: password || undefined };
}

/**
 * Clear stored credentials.
 */
export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CRED_USERNAME_KEY);
  await SecureStore.deleteItemAsync(CRED_PASSWORD_KEY);
}

/**
 * Create auth callback for git operations.
 */
function createOnAuth(credentials: GitCredentials) {
  return () => ({
    username: credentials.username,
    password: credentials.password,
  });
}

/**
 * Create auth callback based on credential type (HTTP or SSH).
 */
function createAuthCallback(credentials: GitCredentials) {
  return createOnAuth(credentials);
}

/**
 * Progress callback type for clone/fetch operations.
 */
export type ProgressCallback = (phase: string, loaded: number, total: number | null) => void;

/**
 * Clone a repository.
 */
export async function clone(
  url: string,
  dir: string,
  credentials: GitCredentials,
  onProgress?: ProgressCallback
): Promise<void> {
  // Ensure directory exists
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  await git.clone({
    fs,
    http,
    dir,
    url,
    depth: 1,
    singleBranch: true,
    onAuth: createOnAuth(credentials),
    onProgress: onProgress
      ? (progress) => {
          onProgress(progress.phase, progress.loaded, progress.total ?? null);
        }
      : undefined,
  });
}

/**
 * Pull changes from remote.
 */
export async function pull(
  dir: string,
  credentials: GitCredentials
): Promise<PullResult> {
  try {
    // Fetch first
    await git.fetch({
      fs,
      http,
      dir,
      onAuth: createOnAuth(credentials),
    });

    // Get current branch
    const branch = await git.currentBranch({ fs, dir });
    if (!branch) {
      return { success: false, updatedFiles: [], conflicts: [] };
    }

    // Get current and remote commits
    const localRef = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    const remoteRef = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });

    if (localRef === remoteRef) {
      // Already up to date
      return { success: true, updatedFiles: [], conflicts: [] };
    }

    // Get changed files
    const trees = [
      git.TREE({ ref: localRef }),
      git.TREE({ ref: remoteRef }),
    ];
    const changes = await git.walk({
      fs,
      dir,
      trees,
      map: async function (filepath, [local, remote]) {
        if (!filepath || filepath === '.') return null;

        const localOid = local ? await local.oid() : null;
        const remoteOid = remote ? await remote.oid() : null;

        if (localOid !== remoteOid) {
          return filepath;
        }
        return null;
      },
    });
    const updatedFiles = changes.filter((f: unknown): f is string => f !== null);

    // Fast-forward merge (simple case)
    await git.merge({
      fs,
      dir,
      ours: branch,
      theirs: `origin/${branch}`,
      fastForward: true,
      author: { name: 'Chronicle Mobile', email: 'app@chronicle.local' },
    });

    // Checkout to update working tree
    await git.checkout({ fs, dir, ref: branch, force: true });

    return { success: true, updatedFiles, conflicts: [] };
  } catch (error) {
    // Check for conflicts
    if (error instanceof Error && error.message.includes('conflict')) {
      return { success: false, updatedFiles: [], conflicts: ['merge conflict'] };
    }
    throw error;
  }
}

/**
 * Push changes to remote.
 */
export async function push(
  dir: string,
  credentials: GitCredentials
): Promise<PushResult> {
  const result = await git.push({
    fs,
    http,
    dir,
    onAuth: createOnAuth(credentials),
  });

  const refStatus = result.refs?.['refs/heads/main'] || result.refs?.['refs/heads/master'];
  return {
    success: !result.error,
    ref: refStatus ? String(refStatus) : '',
  };
}

/**
 * Get file status.
 */
export async function status(dir: string): Promise<FileStatus[]> {
  const matrix = await git.statusMatrix({ fs, dir });
  const statuses: FileStatus[] = [];

  for (const [filepath, head, workdir, stage] of matrix) {
    // Skip .git directory
    if (filepath.startsWith('.git')) continue;

    let status: FileStatus['status'] | null = null;

    if (head === 0 && workdir === 2 && stage === 0) {
      status = 'untracked';
    } else if (head === 0 && workdir === 2 && stage === 2) {
      status = 'added';
    } else if (head === 1 && workdir === 2 && stage === 2) {
      status = 'modified';
    } else if (head === 1 && workdir === 0 && stage === 0) {
      status = 'deleted';
    }

    if (status) {
      statuses.push({ path: filepath, status });
    }
  }

  return statuses;
}

/**
 * Stage a file.
 */
export async function add(dir: string, filepath: string): Promise<void> {
  await git.add({ fs, dir, filepath });
}

/**
 * Create a commit.
 */
export async function commit(
  dir: string,
  message: string,
  author: Author
): Promise<string> {
  const sha = await git.commit({
    fs,
    dir,
    message,
    author,
  });
  return sha;
}

/**
 * Check if there are merge conflicts.
 */
export async function hasConflicts(dir: string): Promise<boolean> {
  try {
    const indexPath = `${dir}/.git/index`;
    const info = await FileSystem.getInfoAsync(indexPath);
    if (!info.exists) return false;

    // Simple heuristic: check for conflict markers in tracked files
    const files = await status(dir);
    for (const file of files) {
      if (file.status === 'modified') {
        const content = await FileSystem.readAsStringAsync(`${dir}/${file.path}`);
        if (content.includes('<<<<<<<') || content.includes('>>>>>>>')) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Resolve a conflict by writing the resolved content.
 */
export async function resolveConflict(
  dir: string,
  filepath: string,
  content: string
): Promise<void> {
  const fullPath = `${dir}/${filepath}`;
  await FileSystem.writeAsStringAsync(fullPath, content);
  await add(dir, filepath);
}

/**
 * Get the current branch name.
 */
export async function getCurrentBranch(dir: string): Promise<string | null> {
  try {
    const branch = await git.currentBranch({ fs, dir });
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Check if a directory is a git repository.
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const gitDir = `${dir}/.git`;
    const info = await FileSystem.getInfoAsync(gitDir);
    return info.exists && info.isDirectory;
  } catch {
    return false;
  }
}

/**
 * Initialize a new git repository.
 */
export async function init(dir: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  await git.init({ fs, dir });
}

/**
 * Set the remote URL.
 */
export async function setRemote(
  dir: string,
  name: string,
  url: string
): Promise<void> {
  await git.addRemote({ fs, dir, remote: name, url });
}

/**
 * Check if a specific file has been modified on remote since local version.
 * Used for conflict detection in the editor.
 */
export async function checkRemoteModified(
  dir: string,
  filepath: string,
  credentials: GitCredentials
): Promise<ConflictState> {
  try {
    // Fetch latest from remote without merging
    await git.fetch({
      fs,
      http,
      dir,
      onAuth: createAuthCallback(credentials),
    });

    const branch = await git.currentBranch({ fs, dir });
    if (!branch) {
      return { hasConflict: false, remoteModified: null, localModified: null };
    }

    // Get local HEAD commit for the file
    const localRef = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    const remoteRef = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });

    // If same commit, no conflict possible
    if (localRef === remoteRef) {
      return { hasConflict: false, remoteModified: null, localModified: null };
    }

    // Get file OIDs from both commits
    let localOid: string | null = null;
    let remoteOid: string | null = null;
    let localCommitTime: Date | null = null;
    let remoteCommitTime: Date | null = null;

    try {
      const localEntry = await git.readTree({
        fs,
        dir,
        oid: localRef,
        filepath,
      });
      localOid = localEntry.tree[0]?.oid || null;

      const localCommit = await git.readCommit({ fs, dir, oid: localRef });
      localCommitTime = new Date(localCommit.commit.author.timestamp * 1000);
    } catch {
      // File doesn't exist in local
    }

    try {
      const remoteEntry = await git.readTree({
        fs,
        dir,
        oid: remoteRef,
        filepath,
      });
      remoteOid = remoteEntry.tree[0]?.oid || null;

      const remoteCommit = await git.readCommit({ fs, dir, oid: remoteRef });
      remoteCommitTime = new Date(remoteCommit.commit.author.timestamp * 1000);
    } catch {
      // File doesn't exist in remote
    }

    // Check if file was modified on remote
    const hasConflict = localOid !== null && remoteOid !== null && localOid !== remoteOid;

    return {
      hasConflict,
      remoteModified: remoteCommitTime,
      localModified: localCommitTime,
    };
  } catch {
    // Network or other error - assume no conflict
    return { hasConflict: false, remoteModified: null, localModified: null };
  }
}

/**
 * Get the remote version of a file for comparison.
 */
export async function getRemoteFileContent(
  dir: string,
  filepath: string,
  credentials: GitCredentials
): Promise<string | null> {
  try {
    await git.fetch({
      fs,
      http,
      dir,
      onAuth: createAuthCallback(credentials),
    });

    const branch = await git.currentBranch({ fs, dir });
    if (!branch) return null;

    const remoteRef = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });

    const { blob } = await git.readBlob({
      fs,
      dir,
      oid: remoteRef,
      filepath,
    });

    return new TextDecoder().decode(blob);
  } catch {
    return null;
  }
}
