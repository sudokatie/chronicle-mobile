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
  attachments?: Attachment[];
  preview?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'file';
  uri: string;
  filename: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number; // For audio attachments, in seconds
}

export interface QuickCaptureData {
  title: string;
  content: string;
  attachments: Attachment[];
  voiceTranscript?: string;
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
  backgroundSyncEnabled: boolean;
  backgroundSyncInterval: number;
  syncOnReconnect: boolean;
}

export interface GitCredentials {
  username: string;
  /** Authentication type. Defaults to 'http' if not specified. */
  authType?: 'http' | 'ssh';
  /** Password or personal access token for HTTP auth. */
  password?: string;
  /** Private key for SSH auth. */
  privateKey?: string;
  /** Public key for SSH auth. */
  publicKey?: string;
  /** Passphrase for encrypted SSH keys. */
  passphrase?: string;
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

export interface VoiceRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri?: string;
}

export interface ShareIntentData {
  type: 'text' | 'url' | 'image' | 'file';
  text?: string;
  url?: string;
  uri?: string;
  mimeType?: string;
}

export interface BackgroundSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export interface ConflictState {
  hasConflict: boolean;
  remoteModified: Date | null;
  localModified: Date | null;
}
