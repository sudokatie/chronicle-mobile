import * as SQLite from 'expo-sqlite';
import { NoteCache, Settings } from '../types';

const DB_NAME = 'chronicle.db';

let db: SQLite.SQLiteDatabase | null = null;

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

/**
 * Execute a query and return results.
 */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const database = await getDb();
  const result = await database.getAllAsync(sql, params);
  return result as T[];
}

/**
 * Execute a statement (insert, update, delete).
 */
export async function execute(sql: string, params: unknown[] = []): Promise<void> {
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

/**
 * Get a setting by key.
 */
export async function getSetting<T>(key: string): Promise<T | null> {
  const results = await query<{ key: string; value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  if (results.length === 0) return null;
  try {
    return JSON.parse(results[0].value) as T;
  } catch {
    return results[0].value as T;
  }
}

/**
 * Set a setting value.
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
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
 * Close database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
