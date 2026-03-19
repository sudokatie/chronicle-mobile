import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { getNote, updateNote } from '../services/notes';

interface UseNoteResult {
  note: Note | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  dirty: boolean;
  content: string;
  setContent: (content: string) => void;
  save: () => Promise<boolean>;
  reload: () => Promise<void>;
}

/**
 * Hook for loading and editing a single note.
 */
export function useNote(id: string | undefined): UseNoteResult {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  const dirty = content !== originalContent;

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError('No note ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedNote = await getNote(id);
      if (fetchedNote) {
        setNote(fetchedNote);
        setContent(fetchedNote.content);
        setOriginalContent(fetchedNote.content);
      } else {
        setError('Note not found');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load note';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!note || !dirty) return true;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateNote(note.id, content);
      if (updated) {
        setNote(updated);
        setOriginalContent(content);
        return true;
      } else {
        setError('Failed to save note');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [note, content, dirty]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  return {
    note,
    loading,
    error,
    saving,
    dirty,
    content,
    setContent,
    save,
    reload,
  };
}
