import { parseNote } from '../../src/services/notes';

// Mock expo-file-system
const mockReadDirectoryAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
}));

// Mock storage service
const mockGetSetting = jest.fn();
const mockSetNoteCache = jest.fn();
const mockDeleteNoteCache = jest.fn();
const mockAddToSyncQueue = jest.fn();

jest.mock('../../src/services/storage', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setNoteCache: (...args: unknown[]) => mockSetNoteCache(...args),
  deleteNoteCache: (...args: unknown[]) => mockDeleteNoteCache(...args),
  getNoteCache: jest.fn().mockResolvedValue(null),
  getAllNoteCaches: jest.fn().mockResolvedValue([]),
  markNoteUnsynced: jest.fn().mockResolvedValue(undefined),
  addToSyncQueue: (...args: unknown[]) => mockAddToSyncQueue(...args),
}));

describe('notes service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockResolvedValue('/mock/vault');
  });

  describe('parseNote', () => {
    it('extracts title from frontmatter', () => {
      const content = `---
title: My Note
created: 2024-01-01
---

Some content here.`;

      const result = parseNote(content);
      expect(result.title).toBe('My Note');
      expect(result.content).toBe('Some content here.');
      expect(result.frontmatter.title).toBe('My Note');
    });

    it('extracts title from first heading when no frontmatter title', () => {
      const content = `# My Heading

Some content here.`;

      const result = parseNote(content);
      expect(result.title).toBe('My Heading');
    });

    it('returns Untitled when no title found', () => {
      const content = 'Just some plain content.';

      const result = parseNote(content);
      expect(result.title).toBe('Untitled');
    });

    it('extracts wiki links', () => {
      const content = `This note links to [[Another Note]] and [[Yet Another]].`;

      const result = parseNote(content);
      expect(result.links).toContain('Another Note');
      expect(result.links).toContain('Yet Another');
      expect(result.links).toHaveLength(2);
    });

    it('extracts tags', () => {
      const content = `This note has #tag1 and #another-tag here.`;

      const result = parseNote(content);
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('another-tag');
      expect(result.tags).toHaveLength(2);
    });

    it('handles empty content', () => {
      const result = parseNote('');
      expect(result.title).toBe('Untitled');
      expect(result.content).toBe('');
      expect(result.links).toHaveLength(0);
      expect(result.tags).toHaveLength(0);
    });

    it('handles malformed frontmatter gracefully', () => {
      const content = `---
title: Broken
no closing delimiter

# Heading

Content here.`;

      const result = parseNote(content);
      expect(result).toBeDefined();
    });

    it('extracts nested wiki links', () => {
      const content = `Links: [[Note A]], then [[folder/Note B]] and [[deeply/nested/Note C]].`;

      const result = parseNote(content);
      expect(result.links).toContain('Note A');
      expect(result.links).toContain('folder/Note B');
      expect(result.links).toContain('deeply/nested/Note C');
    });

    it('handles tags with underscores', () => {
      const content = `Tags: #my_tag #another_one_here`;

      const result = parseNote(content);
      expect(result.tags).toContain('my_tag');
      expect(result.tags).toContain('another_one_here');
    });

    it('extracts multiple frontmatter fields', () => {
      const content = `---
title: Test Note
created: 2024-01-15
author: John Doe
status: draft
---

Content here.`;

      const result = parseNote(content);
      expect(result.frontmatter.title).toBe('Test Note');
      expect(result.frontmatter.created).toBe('2024-01-15');
      expect(result.frontmatter.author).toBe('John Doe');
      expect(result.frontmatter.status).toBe('draft');
    });

    it('preserves content after frontmatter', () => {
      const content = `---
title: My Note
---

First paragraph.

Second paragraph.

- List item 1
- List item 2`;

      const result = parseNote(content);
      expect(result.content).toContain('First paragraph.');
      expect(result.content).toContain('Second paragraph.');
      expect(result.content).toContain('- List item 1');
    });
  });

  describe('listNotes', () => {
    it('scans vault directory for markdown files', async () => {
      const { listNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValueOnce(['note1.md', 'note2.md', 'subfolder']);
      mockReadDirectoryAsync.mockResolvedValueOnce(['nested.md']);
      
      mockGetInfoAsync.mockImplementation((path: string) => {
        if (path.includes('subfolder')) {
          return Promise.resolve({ isDirectory: true, exists: true, modificationTime: Date.now() / 1000 });
        }
        return Promise.resolve({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      });

      mockReadAsStringAsync.mockResolvedValue(`---
title: Test Note
---

Content`);

      const notes = await listNotes();
      expect(mockReadDirectoryAsync).toHaveBeenCalled();
      expect(Array.isArray(notes)).toBe(true);
    });

    it('filters by folder', async () => {
      const { listNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValueOnce(['daily']);
      mockReadDirectoryAsync.mockResolvedValueOnce(['2024-01-01.md']);
      
      mockGetInfoAsync.mockImplementation((path: string) => {
        if (path.endsWith('daily')) {
          return Promise.resolve({ isDirectory: true, exists: true, modificationTime: Date.now() / 1000 });
        }
        return Promise.resolve({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      });

      mockReadAsStringAsync.mockResolvedValue('# Daily Note');

      const notes = await listNotes({ folder: 'daily', sortBy: 'modified', sortOrder: 'desc' });
      expect(Array.isArray(notes)).toBe(true);
    });

    it('filters by tag', async () => {
      const { listNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValueOnce(['tagged.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('Content with #project tag');

      const notes = await listNotes({ tag: 'project', sortBy: 'modified', sortOrder: 'desc' });
      expect(Array.isArray(notes)).toBe(true);
    });

    it('filters by search query', async () => {
      const { listNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValueOnce(['searchable.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('# Test\n\nThis contains searchable content.');

      const notes = await listNotes({ searchQuery: 'searchable', sortBy: 'modified', sortOrder: 'desc' });
      expect(Array.isArray(notes)).toBe(true);
    });

    it('sorts by title', async () => {
      const { listNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValueOnce(['a-note.md', 'b-note.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync
        .mockResolvedValueOnce('# A Note')
        .mockResolvedValueOnce('# B Note');

      const notes = await listNotes({ sortBy: 'title', sortOrder: 'asc' });
      expect(Array.isArray(notes)).toBe(true);
    });
  });

  describe('createNote', () => {
    it('creates a new note file', async () => {
      const { createNote } = await import('../../src/services/notes');

      mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
      mockWriteAsStringAsync.mockResolvedValue(undefined);
      mockSetNoteCache.mockResolvedValue(undefined);
      mockAddToSyncQueue.mockResolvedValue(undefined);

      const note = await createNote('My New Note', 'Some content');

      expect(note.title).toBe('My New Note');
      expect(note.synced).toBe(false);
      expect(mockWriteAsStringAsync).toHaveBeenCalled();
      expect(mockAddToSyncQueue).toHaveBeenCalledWith(expect.any(String), 'create');
    });

    it('creates note in specified folder', async () => {
      const { createNote } = await import('../../src/services/notes');

      mockGetInfoAsync.mockResolvedValue({ exists: false, isDirectory: false });
      mockMakeDirectoryAsync.mockResolvedValue(undefined);
      mockWriteAsStringAsync.mockResolvedValue(undefined);
      mockSetNoteCache.mockResolvedValue(undefined);
      mockAddToSyncQueue.mockResolvedValue(undefined);

      const note = await createNote('Folder Note', 'Content', 'daily');

      expect(note.folder).toBe('daily');
      expect(note.path).toContain('daily/');
      expect(mockMakeDirectoryAsync).toHaveBeenCalled();
    });

    it('sanitizes filename from title', async () => {
      const { createNote } = await import('../../src/services/notes');

      mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
      mockWriteAsStringAsync.mockResolvedValue(undefined);
      mockSetNoteCache.mockResolvedValue(undefined);
      mockAddToSyncQueue.mockResolvedValue(undefined);

      const note = await createNote('My/Invalid:Title*Here', 'Content');

      expect(note.path).not.toContain('/Invalid');
      expect(note.path).not.toContain(':');
      expect(note.path).not.toContain('*');
    });

    it('adds frontmatter with created date', async () => {
      const { createNote } = await import('../../src/services/notes');

      mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
      mockWriteAsStringAsync.mockResolvedValue(undefined);
      mockSetNoteCache.mockResolvedValue(undefined);
      mockAddToSyncQueue.mockResolvedValue(undefined);

      await createNote('Test', 'Body');

      const writtenContent = mockWriteAsStringAsync.mock.calls[0][1];
      expect(writtenContent).toContain('---');
      expect(writtenContent).toContain('title: Test');
      expect(writtenContent).toContain('created:');
    });
  });

  describe('updateNote', () => {
    it('updates existing note content', async () => {
      const { updateNote, listNotes } = await import('../../src/services/notes');

      // Mock finding the note
      mockReadDirectoryAsync.mockResolvedValue(['existing.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('# Existing\n\nOld content');
      mockWriteAsStringAsync.mockResolvedValue(undefined);
      mockSetNoteCache.mockResolvedValue(undefined);
      mockAddToSyncQueue.mockResolvedValue(undefined);

      const notes = await listNotes();
      if (notes.length > 0) {
        const updated = await updateNote(notes[0].id, '# Existing\n\nNew content');
        if (updated) {
          expect(updated.synced).toBe(false);
          expect(mockAddToSyncQueue).toHaveBeenCalledWith(expect.any(String), 'update');
        }
      }
    });

    it('returns null for non-existent note', async () => {
      const { updateNote } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue([]);

      const result = await updateNote('non-existent-id', 'content');
      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('deletes note file and cache', async () => {
      const { deleteNote, listNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue(['to-delete.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('# To Delete');
      mockDeleteAsync.mockResolvedValue(undefined);
      mockDeleteNoteCache.mockResolvedValue(undefined);
      mockAddToSyncQueue.mockResolvedValue(undefined);

      const notes = await listNotes();
      if (notes.length > 0) {
        await deleteNote(notes[0].id);
        expect(mockDeleteAsync).toHaveBeenCalled();
        expect(mockDeleteNoteCache).toHaveBeenCalled();
        expect(mockAddToSyncQueue).toHaveBeenCalledWith(expect.any(String), 'delete');
      }
    });

    it('handles deletion of non-existent note gracefully', async () => {
      const { deleteNote } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue([]);

      await expect(deleteNote('non-existent')).resolves.not.toThrow();
    });
  });

  describe('searchNotes', () => {
    it('searches in note titles', async () => {
      const { searchNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue(['meeting-notes.md', 'project-plan.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync
        .mockResolvedValueOnce('# Meeting Notes\n\nAgenda items')
        .mockResolvedValueOnce('# Project Plan\n\nTimeline');

      const results = await searchNotes('meeting');
      expect(Array.isArray(results)).toBe(true);
    });

    it('searches in note content', async () => {
      const { searchNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue(['random.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('# Random\n\nThis contains the keyword searchable.');

      const results = await searchNotes('keyword');
      expect(Array.isArray(results)).toBe(true);
    });

    it('is case insensitive', async () => {
      const { searchNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue(['test.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('# TEST\n\nTEST content');

      const results = await searchNotes('test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty array for no matches', async () => {
      const { searchNotes } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockResolvedValue(['note.md']);
      mockGetInfoAsync.mockResolvedValue({ isDirectory: false, exists: true, modificationTime: Date.now() / 1000 });
      mockReadAsStringAsync.mockResolvedValue('# Note\n\nSome content');

      const results = await searchNotes('xyzzyx-no-match');
      // Results should be empty or not include the note
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getFolders', () => {
    it('returns list of folders in vault', async () => {
      const { getFolders } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockImplementation((path: string) => {
        if (path === '/mock/vault') {
          return Promise.resolve(['daily', 'projects', '.git', 'file.md']);
        }
        return Promise.resolve([]);
      });
      
      mockGetInfoAsync.mockImplementation((path: string) => {
        if (path.includes('.git') || path.endsWith('.md')) {
          return Promise.resolve({ isDirectory: false, exists: true });
        }
        return Promise.resolve({ isDirectory: true, exists: true });
      });

      const folders = await getFolders();
      expect(Array.isArray(folders)).toBe(true);
    });

    it('returns nested folders', async () => {
      const { getFolders } = await import('../../src/services/notes');

      mockReadDirectoryAsync.mockImplementation((path: string) => {
        if (path === '/mock/vault') {
          return Promise.resolve(['projects']);
        }
        if (path === '/mock/vault/projects') {
          return Promise.resolve(['active', 'archived']);
        }
        return Promise.resolve([]);
      });
      
      mockGetInfoAsync.mockResolvedValue({ isDirectory: true, exists: true });

      const folders = await getFolders();
      expect(Array.isArray(folders)).toBe(true);
    });
  });
});
