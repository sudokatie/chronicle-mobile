import { parseNote } from '../../src/services/notes';

describe('notes service', () => {
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

      // Should not crash, returns content as-is
      const result = parseNote(content);
      expect(result).toBeDefined();
    });
  });
});
