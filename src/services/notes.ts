import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system';
import { Note, ParsedNote, NoteFilter } from '../types';
import {
  getNoteCache,
  setNoteCache,
  deleteNoteCache,
  getAllNoteCaches,
  markNoteUnsynced,
  addToSyncQueue,
  getSetting,
} from './storage';

/**
 * Get the vault directory path.
 */
async function getVaultPath(): Promise<string> {
  const path = await getSetting<string>('vaultPath');
  return path || `${Paths.document.uri}vault`;
}

/**
 * Generate a UUID for note IDs.
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse note content into structured format.
 */
export function parseNote(content: string): ParsedNote {
  let title = 'Untitled';
  let body = content;
  let frontmatter: Record<string, unknown> = {};

  // Parse YAML frontmatter
  if (content.startsWith('---')) {
    const endIndex = content.indexOf('---', 3);
    if (endIndex !== -1) {
      const frontmatterStr = content.slice(3, endIndex).trim();
      body = content.slice(endIndex + 3).trim();

      // Simple YAML parsing
      for (const line of frontmatterStr.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          frontmatter[key] = value;
          if (key === 'title') title = value;
        }
      }
    }
  }

  // Extract title from first heading if not in frontmatter
  if (title === 'Untitled') {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1];
    }
  }

  // Extract wiki links [[Note Name]]
  const links: string[] = [];
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }

  // Extract tags #tag
  const tags: string[] = [];
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }

  return { title, content: body, frontmatter, links, tags };
}

/**
 * Get preview text from content (first 100 chars).
 */
function getPreview(content: string): string {
  const parsed = parseNote(content);
  const text = parsed.content.replace(/[#*_`\[\]]/g, '').trim();
  return text.slice(0, 100);
}

/**
 * List all notes from the vault.
 */
export async function listNotes(filter?: NoteFilter): Promise<Note[]> {
  const vaultPath = await getVaultPath();
  const notes: Note[] = [];

  async function scanDirectory(dirPath: string, folder: string = ''): Promise<void> {
    try {
      const entries = await FileSystem.readDirectoryAsync(dirPath);
      if (!Array.isArray(entries)) return;

      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry}`;
        const info = await FileSystem.getInfoAsync(fullPath);

        if (!info.exists) continue;

        if (info.isDirectory) {
          await scanDirectory(fullPath, folder ? `${folder}/${entry}` : entry);
        } else if (entry.endsWith('.md')) {
          const relativePath = folder ? `${folder}/${entry}` : entry;
          const content = await FileSystem.readAsStringAsync(fullPath);
          const parsed = parseNote(content);

          const note: Note = {
            id: relativePath.replace(/[/\\]/g, '-').replace('.md', ''),
            path: relativePath,
            title: parsed.title,
            content,
            created: new Date(info.modificationTime ?? Date.now()),
            modified: new Date(info.modificationTime ?? Date.now()),
            synced: true,
            conflicted: false,
            folder: folder || undefined,
            tags: parsed.tags,
          };

          // Apply filters
          if (filter?.folder && folder !== filter.folder) continue;
          if (filter?.tag && !parsed.tags.includes(filter.tag)) continue;
          if (filter?.searchQuery) {
            const query = filter.searchQuery.toLowerCase();
            if (
              !note.title.toLowerCase().includes(query) &&
              !note.content.toLowerCase().includes(query)
            ) {
              continue;
            }
          }

          notes.push(note);

          // Update cache
          await setNoteCache(relativePath, {
            title: note.title,
            preview: getPreview(content),
            modified: note.modified.getTime(),
            synced: true,
          });
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
  }

  await scanDirectory(vaultPath);

  // Sort notes
  const sortBy = filter?.sortBy || 'modified';
  const sortOrder = filter?.sortOrder || 'desc';

  notes.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'created') {
      comparison = a.created.getTime() - b.created.getTime();
    } else {
      comparison = a.modified.getTime() - b.modified.getTime();
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return notes;
}

/**
 * Get a note by ID.
 */
export async function getNote(id: string): Promise<Note | null> {
  const notes = await listNotes();
  return notes.find((n) => n.id === id) || null;
}

/**
 * Get a note by path.
 */
export async function getNoteByPath(path: string): Promise<Note | null> {
  const vaultPath = await getVaultPath();
  const fullPath = `${vaultPath}/${path}`;

  try {
    const info = await FileSystem.getInfoAsync(fullPath);
    if (!info.exists) return null;

    const content = await FileSystem.readAsStringAsync(fullPath);
    const parsed = parseNote(content);

    return {
      id: path.replace(/[/\\]/g, '-').replace('.md', ''),
      path,
      title: parsed.title,
      content,
      created: new Date(info.modificationTime ?? Date.now()),
      modified: new Date(info.modificationTime ?? Date.now()),
      synced: true,
      conflicted: false,
      tags: parsed.tags,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new note.
 */
export async function createNote(
  title: string,
  content: string = '',
  folder?: string
): Promise<Note> {
  const vaultPath = await getVaultPath();
  const filename = `${title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.md`;
  const relativePath = folder ? `${folder}/${filename}` : filename;
  const fullPath = `${vaultPath}/${relativePath}`;

  // Ensure folder exists
  if (folder) {
    const folderPath = `${vaultPath}/${folder}`;
    const folderInfo = await FileSystem.getInfoAsync(folderPath);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
    }
  }

  // Create note content with frontmatter
  const noteContent = `---
title: ${title}
created: ${new Date().toISOString()}
---

${content}`;

  await FileSystem.writeAsStringAsync(fullPath, noteContent);

  const note: Note = {
    id: generateId(),
    path: relativePath,
    title,
    content: noteContent,
    created: new Date(),
    modified: new Date(),
    synced: false,
    conflicted: false,
    folder,
    tags: [],
  };

  // Update cache and queue sync
  await setNoteCache(relativePath, {
    title,
    preview: getPreview(noteContent),
    modified: note.modified.getTime(),
    synced: false,
  });
  await addToSyncQueue(relativePath, 'create');

  return note;
}

/**
 * Update an existing note.
 */
export async function updateNote(id: string, content: string): Promise<Note | null> {
  const note = await getNote(id);
  if (!note) return null;

  const vaultPath = await getVaultPath();
  const fullPath = `${vaultPath}/${note.path}`;

  await FileSystem.writeAsStringAsync(fullPath, content);

  const parsed = parseNote(content);
  const updatedNote: Note = {
    ...note,
    content,
    title: parsed.title,
    modified: new Date(),
    synced: false,
    tags: parsed.tags,
  };

  // Update cache and queue sync
  await setNoteCache(note.path, {
    title: updatedNote.title,
    preview: getPreview(content),
    modified: updatedNote.modified.getTime(),
    synced: false,
  });
  await addToSyncQueue(note.path, 'update');

  return updatedNote;
}

/**
 * Delete a note.
 */
export async function deleteNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (!note) return;

  const vaultPath = await getVaultPath();
  const fullPath = `${vaultPath}/${note.path}`;

  await FileSystem.deleteAsync(fullPath, { idempotent: true });
  await deleteNoteCache(note.path);
  await addToSyncQueue(note.path, 'delete');
}

/**
 * Search notes by query.
 */
export async function searchNotes(query: string): Promise<Note[]> {
  return listNotes({ searchQuery: query, sortBy: 'modified', sortOrder: 'desc' });
}

/**
 * Get all folders in the vault.
 */
export async function getFolders(): Promise<string[]> {
  const vaultPath = await getVaultPath();
  const folders: string[] = [];

  async function scanForFolders(dirPath: string, prefix: string = ''): Promise<void> {
    try {
      const entries = await FileSystem.readDirectoryAsync(dirPath);
      if (!Array.isArray(entries)) return;
      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry}`;
        const info = await FileSystem.getInfoAsync(fullPath);
        if (info.isDirectory && !entry.startsWith('.')) {
          const folderPath = prefix ? `${prefix}/${entry}` : entry;
          folders.push(folderPath);
          await scanForFolders(fullPath, folderPath);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  await scanForFolders(vaultPath);
  return folders.sort();
}

/**
 * Page size for paginated note listing.
 */
export const PAGE_SIZE = 20;

/**
 * List notes with pagination support.
 */
export async function listNotesPaginated(
  offset: number = 0,
  limit: number = PAGE_SIZE,
  filter?: NoteFilter
): Promise<{ notes: Note[]; hasMore: boolean; total: number }> {
  const allNotes = await listNotes(filter);
  const notes = allNotes.slice(offset, offset + limit);
  return {
    notes,
    hasMore: offset + limit < allNotes.length,
    total: allNotes.length,
  };
}

/**
 * Search notes with pagination support.
 */
export async function searchNotesPaginated(
  query: string,
  offset: number = 0,
  limit: number = PAGE_SIZE
): Promise<{ notes: Note[]; hasMore: boolean; total: number }> {
  const allNotes = await searchNotes(query);
  const notes = allNotes.slice(offset, offset + limit);
  return {
    notes,
    hasMore: offset + limit < allNotes.length,
    total: allNotes.length,
  };
}

/**
 * Archive a note by moving it to the archive folder.
 */
export async function archiveNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (!note) return;

  const vaultPath = await getVaultPath();
  const archivePath = `${vaultPath}/.archive`;

  // Ensure archive directory exists
  const archiveInfo = await FileSystem.getInfoAsync(archivePath);
  if (!archiveInfo.exists) {
    await FileSystem.makeDirectoryAsync(archivePath, { intermediates: true });
  }

  // Move note to archive
  const oldPath = `${vaultPath}/${note.path}`;
  const filename = note.path.split('/').pop() || `${id}.md`;
  const newPath = `${archivePath}/${filename}`;

  await FileSystem.moveAsync({ from: oldPath, to: newPath });
  await deleteNoteCache(id);
  await addToSyncQueue(note.path, 'delete');
  await addToSyncQueue(`.archive/${filename}`, 'create');
}

/**
 * Refresh the note cache by re-scanning the vault.
 */
export async function refreshNoteCache(): Promise<void> {
  const notes = await listNotes();
  for (const note of notes) {
    await setNoteCache(note.path, {
      title: note.title,
      preview: note.content.slice(0, 100),
      modified: note.modified.getTime(),
      synced: note.synced,
    });
  }
}
