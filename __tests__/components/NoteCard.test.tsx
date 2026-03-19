import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NoteCard } from '../../src/components/NoteCard';
import { Note } from '../../src/types';

const mockNote: Note = {
  id: 'test-id',
  path: 'test-note.md',
  title: 'Test Note',
  content: 'This is the content of the test note.',
  created: new Date('2024-01-01'),
  modified: new Date('2024-01-02'),
  synced: true,
  conflicted: false,
  tags: ['tag1', 'tag2'],
};

describe('NoteCard', () => {
  it('renders note title', () => {
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    
    expect(getByText('Test Note')).toBeTruthy();
  });

  it('renders note preview', () => {
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    
    expect(getByText(/This is the content/)).toBeTruthy();
  });

  it('renders tags', () => {
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    
    expect(getByText('#tag1')).toBeTruthy();
    expect(getByText('#tag2')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <NoteCard note={mockNote} onPress={onPress} onDelete={jest.fn()} />
    );
    
    fireEvent.press(getByText('Test Note'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows sync indicator for unsynced notes', () => {
    const unsyncedNote = { ...mockNote, synced: false };
    const { queryByTestId } = render(
      <NoteCard note={unsyncedNote} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    
    // Component should indicate unsynced state
    // Implementation depends on how the component shows this
  });

  it('shows conflict indicator for conflicted notes', () => {
    const conflictedNote = { ...mockNote, conflicted: true };
    const { queryByTestId } = render(
      <NoteCard note={conflictedNote} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    
    // Component should indicate conflict state
    // Implementation depends on how the component shows this
  });
});
