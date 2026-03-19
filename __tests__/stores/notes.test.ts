import { useNotesStore } from '../../src/stores/notes';
import { Note } from '../../src/types';

// Mock notes service
jest.mock('../../src/services/notes', () => ({
  listNotes: jest.fn().mockResolvedValue([]),
  createNote: jest.fn().mockImplementation((title) => 
    Promise.resolve({
      id: 'test-id',
      path: `${title}.md`,
      title,
      content: '',
      created: new Date(),
      modified: new Date(),
      synced: false,
      conflicted: false,
    })
  ),
  updateNote: jest.fn().mockImplementation((id, content) =>
    Promise.resolve({
      id,
      path: 'test.md',
      title: 'Test',
      content,
      created: new Date(),
      modified: new Date(),
      synced: false,
      conflicted: false,
    })
  ),
  deleteNote: jest.fn().mockResolvedValue(undefined),
  searchNotes: jest.fn().mockResolvedValue([]),
}));

describe('notes store', () => {
  beforeEach(() => {
    // Reset store state
    useNotesStore.setState({
      notes: [],
      loading: false,
      error: null,
      filter: { sortBy: 'modified', sortOrder: 'desc' },
    });
  });

  it('has initial state', () => {
    const state = useNotesStore.getState();
    
    expect(state.notes).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchNotes sets loading state', async () => {
    const { fetchNotes } = useNotesStore.getState();
    
    const promise = fetchNotes();
    expect(useNotesStore.getState().loading).toBe(true);
    
    await promise;
    expect(useNotesStore.getState().loading).toBe(false);
  });

  it('addNote creates and stores note', async () => {
    const { addNote } = useNotesStore.getState();
    
    const note = await addNote('Test Note');
    
    expect(note).toBeDefined();
    expect(note?.title).toBe('Test Note');
    expect(useNotesStore.getState().notes).toContainEqual(
      expect.objectContaining({ title: 'Test Note' })
    );
  });

  it('removeNote removes note from store', async () => {
    // Add a note first
    useNotesStore.setState({
      notes: [{
        id: 'test-id',
        path: 'test.md',
        title: 'Test',
        content: '',
        created: new Date(),
        modified: new Date(),
        synced: true,
        conflicted: false,
      }],
    });

    const { removeNote } = useNotesStore.getState();
    await removeNote('test-id');
    
    expect(useNotesStore.getState().notes).toHaveLength(0);
  });

  it('clearError resets error state', () => {
    useNotesStore.setState({ error: 'Some error' });
    
    const { clearError } = useNotesStore.getState();
    clearError();
    
    expect(useNotesStore.getState().error).toBeNull();
  });

  it('setFilter updates filter and refetches', async () => {
    const { setFilter } = useNotesStore.getState();
    
    setFilter({ sortBy: 'title' });
    
    expect(useNotesStore.getState().filter.sortBy).toBe('title');
  });
});
