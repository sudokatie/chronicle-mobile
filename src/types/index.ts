// Core types for Chronicle Mobile

export interface Note {
  id: string;
  path: string;
  title: string;
  content: string;
  created: Date;
  modified: Date;
  synced: boolean;
  conflicted: boolean;
  folder?: string;
  tags?: string[];
}

export interface ParsedNote {
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
  links: string[];
  tags: string[];
}

export interface NoteCache {
  path: string;
  title: string;
  preview: string;
  modified: number;
  synced: boolean;
}

export interface SyncState {
  status: 'idle' | 'syncing' | 'error';
  lastSync: Date | null;
  pendingChanges: number;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflicts: string[];
  error?: string;
}

export interface Settings {
  vaultPath: string;
  remoteUrl: string;
  autoSync: boolean;
  syncInterval: number;
  lockEnabled: boolean;
  lockType: 'none' | 'pin' | 'biometric';
  lockTimeout: number;
  onboarded: boolean;
}

export interface GitCredentials {
  username: string;
  password?: string;
  privateKey?: string;
}

export interface FileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked';
}

export interface PullResult {
  success: boolean;
  updatedFiles: string[];
  conflicts: string[];
}

export interface PushResult {
  success: boolean;
  ref: string;
}

export interface Author {
  name: string;
  email: string;
}

export interface NoteFilter {
  folder?: string;
  tag?: string;
  searchQuery?: string;
  sortBy: 'modified' | 'created' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface ConflictInfo {
  path: string;
  localContent: string;
  remoteContent: string;
  baseContent?: string;
}
