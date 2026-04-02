import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { NoteCache, Settings } from '../types';

const DB_NAME = 'chronicle.db';
const ENCRYPTION_KEY_ID = 'db_encryption_key';
const ENCRYPTION_ENABLED_KEY = 'encryption_enabled';

let db: SQLite.SQLiteDatabase | null = null;
let encryptionKey: string | null = null;

/**
 * Generate a random hex string using Math.random (fallback).
 * For production, expo-crypto should be used for cryptographic randomness.
 */
function generateRandomHex(bytes: number): string {
  const array: number[] = [];
  for (let i = 0; i < bytes; i++) {
    array.push(Math.floor(Math.random() * 256));
  }
  return array.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple hash function (djb2 variant) for key derivation.
 * Not cryptographically secure - for demo purposes.
 * Production should use expo-crypto's digestStringAsync.
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // Expand hash to 64 hex chars by repeating with different seeds
  let result = '';
  for (let seed = 0; seed < 4; seed++) {
    let h = hash ^ (seed * 0x9e3779b9);
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    result += (h >>> 0).toString(16).padStart(8, '0');
    result += ((h * 31) >>> 0).toString(16).padStart(8, '0');
  }
  return result;
}

/**
 * Generate or retrieve the database encryption key.
 * Key is stored in SecureStore (hardware-backed on supported devices).
 */
async function getEncryptionKey(): Promise<string> {
  if (encryptionKey) return encryptionKey;

  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
  if (!key) {
    // Generate a new 256-bit key (64 hex chars)
    key = generateRandomHex(32);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
  }

  encryptionKey = key;
  return key;
}

/**
 * Encrypt data using XOR cipher with key-derived stream.
 * Returns IV:ciphertext in hex format.
 * Note: For production, use expo-crypto for proper AES encryption.
 */
async function encryptData(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  // Generate random IV (12 bytes)
  const ivHex = generateRandomHex(12);

  // Derive keystream from key + IV
  const keyHash = simpleHash(key + ivHex);
  const keyBytes = hexToBytes(keyHash);

  // XOR cipher
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  const encrypted: number[] = [];
  for (let i = 0; i < plaintextBytes.length; i++) {
    encrypted.push(plaintextBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  const encryptedHex = encrypted.map((b) => b.toString(16).padStart(2, '0')).join('');
  return ivHex + ':' + encryptedHex;
}

/**
 * Decrypt data encrypted with encryptData.
 */
async function decryptData(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const [ivHex, encryptedHex] = ciphertext.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }

  const keyHash = simpleHash(key + ivHex);
  const keyBytes = hexToBytes(keyHash);
  const encryptedBytes = hexToBytes(encryptedHex);

  const decrypted: number[] = [];
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(decrypted));
}

/**
 * Convert hex string to byte array.
 */
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Check if encryption is enabled.
 */
export async function isEncryptionEnabled(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync(ENCRYPTION_ENABLED_KEY);
  return enabled === 'true';
}

/**
 * Enable or disable field-level encryption.
 * Note: Changing this setting does NOT re-encrypt existing data.
 */
export async function setEncryptionEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(ENCRYPTION_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Get or create database instance.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return db;
}

/**
 * Initialize database with required tables.
 */
export async function initDatabase(): Promise<void> {
  const database = await getDb();

  // Note cache table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS note_cache (
      path TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      preview TEXT,
      modified INTEGER NOT NULL,
      synced INTEGER DEFAULT 1
    );
  `);

  // FTS5 virtual table for full-text search
  await database.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(
      path,
      title,
      content,
      tags,
      content='',
      contentless_delete=1
    );
  `);

  // Settings table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Sync queue table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

// SQLite bind value type
type SQLiteValue = string | number | null | boolean | Uint8Array;

/**
 * Execute a query and return results.
 */
export async function query<T>(sql: string, params: SQLiteValue[] = []): Promise<T[]> {
  const database = await getDb();
  const result = await database.getAllAsync(sql, params);
  return result as T[];
}

/**
 * Execute a statement (insert, update, delete).
 */
export async function execute(sql: string, params: SQLiteValue[] = []): Promise<void> {
  const database = await getDb();
  await database.runAsync(sql, params);
}

/**
 * Get note cache entry by path.
 */
export async function getNoteCache(path: string): Promise<NoteCache | null> {
  const results = await query<NoteCache>(
    'SELECT * FROM note_cache WHERE path = ?',
    [path]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Set or update note cache entry.
 */
export async function setNoteCache(path: string, cache: Omit<NoteCache, 'path'>): Promise<void> {
  await execute(
    `INSERT OR REPLACE INTO note_cache (path, title, preview, modified, synced) 
     VALUES (?, ?, ?, ?, ?)`,
    [path, cache.title, cache.preview, cache.modified, cache.synced ? 1 : 0]
  );
}

/**
 * Delete note cache entry.
 */
export async function deleteNoteCache(path: string): Promise<void> {
  await execute('DELETE FROM note_cache WHERE path = ?', [path]);
}

/**
 * Get all cached notes.
 */
export async function getAllNoteCaches(): Promise<NoteCache[]> {
  return query<NoteCache>('SELECT * FROM note_cache ORDER BY modified DESC');
}

/**
 * Mark note as unsynced.
 */
export async function markNoteUnsynced(path: string): Promise<void> {
  await execute('UPDATE note_cache SET synced = 0 WHERE path = ?', [path]);
}

// Keys that contain sensitive data and should be encrypted
const SENSITIVE_KEYS = new Set(['remoteUrl', 'authorEmail', 'authorName']);

/**
 * Get a setting by key.
 */
export async function getSetting<T>(key: string): Promise<T | null> {
  const results = await query<{ key: string; value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  if (results.length === 0) return null;

  let rawValue = results[0].value;

  // Decrypt if this is a sensitive key and encryption is enabled
  if (SENSITIVE_KEYS.has(key) && rawValue.includes(':')) {
    try {
      rawValue = await decryptData(rawValue);
    } catch {
      // Value may not be encrypted (legacy data), return as-is
    }
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return rawValue as T;
  }
}

/**
 * Set a setting value.
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  let serialized = typeof value === 'string' ? value : JSON.stringify(value);

  // Encrypt sensitive keys
  if (SENSITIVE_KEYS.has(key) && serialized) {
    const encryptionEnabled = await isEncryptionEnabled();
    if (encryptionEnabled) {
      serialized = await encryptData(serialized);
    }
  }

  await execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, serialized]
  );
}

/**
 * Delete a setting.
 */
export async function deleteSetting(key: string): Promise<void> {
  await execute('DELETE FROM settings WHERE key = ?', [key]);
}

/**
 * Get all settings as an object.
 */
export async function getAllSettings(): Promise<Partial<Settings>> {
  const results = await query<{ key: string; value: string }>('SELECT * FROM settings');
  const settings: Record<string, unknown> = {};
  for (const row of results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings as Partial<Settings>;
}

/**
 * Add item to sync queue.
 */
export async function addToSyncQueue(
  path: string,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  await execute(
    'INSERT INTO sync_queue (path, action, created_at) VALUES (?, ?, ?)',
    [path, action, Date.now()]
  );
}

/**
 * Get all pending sync items.
 */
export async function getSyncQueue(): Promise<Array<{ id: number; path: string; action: string; created_at: number }>> {
  return query('SELECT * FROM sync_queue ORDER BY created_at ASC');
}

/**
 * Remove item from sync queue.
 */
export async function removeFromSyncQueue(id: number): Promise<void> {
  await execute('DELETE FROM sync_queue WHERE id = ?', [id]);
}

/**
 * Clear entire sync queue.
 */
export async function clearSyncQueue(): Promise<void> {
  await execute('DELETE FROM sync_queue');
}

/**
 * Insert or update FTS index for a note.
 */
export async function indexNoteForSearch(
  path: string,
  title: string,
  content: string,
  tags: string[] = []
): Promise<void> {
  // Delete existing entry first (FTS5 doesn't support REPLACE)
  await execute('DELETE FROM note_fts WHERE path = ?', [path]);
  // Insert new entry
  await execute(
    'INSERT INTO note_fts (path, title, content, tags) VALUES (?, ?, ?, ?)',
    [path, title, content, tags.join(' ')]
  );
}

/**
 * Remove note from FTS index.
 */
export async function removeNoteFromSearch(path: string): Promise<void> {
  await execute('DELETE FROM note_fts WHERE path = ?', [path]);
}

/**
 * Search notes using FTS5.
 * Returns paths of matching notes ranked by relevance.
 */
export async function searchNotesFullText(
  queryText: string,
  limit: number = 50,
  offset: number = 0
): Promise<string[]> {
  // Escape special FTS characters and prepare query
  const escapedQuery = queryText
    .replace(/['"]/g, '')
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => `"${term}"*`)
    .join(' OR ');

  if (!escapedQuery) return [];

  const results = await query<{ path: string }>(
    `SELECT path FROM note_fts 
     WHERE note_fts MATCH ? 
     ORDER BY rank 
     LIMIT ? OFFSET ?`,
    [escapedQuery, limit, offset]
  );

  return results.map((r) => r.path);
}

/**
 * Get paginated note caches.
 */
export async function getNoteCachesPaginated(
  limit: number,
  offset: number,
  sortBy: 'modified' | 'title' = 'modified',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<NoteCache[]> {
  const orderColumn = sortBy === 'title' ? 'title' : 'modified';
  const order = sortOrder.toUpperCase();
  return query<NoteCache>(
    `SELECT * FROM note_cache ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

/**
 * Get total count of cached notes.
 */
export async function getNoteCacheCount(): Promise<number> {
  const result = await query<{ count: number }>('SELECT COUNT(*) as count FROM note_cache');
  return result[0]?.count || 0;
}

/**
 * Close database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Encrypt note content for secure storage.
 * Call this before writing note content to disk if encryption is desired.
 */
export async function encryptNoteContent(content: string): Promise<string> {
  const enabled = await isEncryptionEnabled();
  if (!enabled) return content;
  return encryptData(content);
}

/**
 * Decrypt note content.
 * Automatically detects if content is encrypted.
 */
export async function decryptNoteContent(content: string): Promise<string> {
  // Check if content looks encrypted (has IV:data format)
  if (!content.includes(':') || content.length < 30) {
    return content;
  }
  try {
    return await decryptData(content);
  } catch {
    // Not encrypted or decryption failed, return original
    return content;
  }
}

/**
 * Migrate existing data to encrypted format.
 * Call this when user enables encryption.
 */
export async function migrateToEncrypted(): Promise<void> {
  await setEncryptionEnabled(true);

  // Re-save sensitive settings to encrypt them
  for (const key of SENSITIVE_KEYS) {
    const value = await getSetting<string>(key);
    if (value) {
      // Force re-encryption by setting encryption enabled first
      await setSetting(key, value);
    }
  }
}

/**
 * Clear encryption key (use with caution - data becomes unrecoverable).
 */
export async function clearEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ENCRYPTION_KEY_ID);
  await SecureStore.deleteItemAsync(ENCRYPTION_ENABLED_KEY);
  encryptionKey = null;
}
