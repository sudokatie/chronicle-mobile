import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SyncStatus } from '../../src/components/SyncStatus';
import { SyncState } from '../../src/types';

describe('SyncStatus', () => {
  const mockOnSync = jest.fn();

  beforeEach(() => {
    mockOnSync.mockClear();
  });

  it('shows synced state when idle with no pending', () => {
    const state: SyncState = {
      status: 'idle',
      lastSync: new Date(),
      pendingChanges: 0,
      error: null,
    };

    const { getByText } = render(
      <SyncStatus state={state} onSync={mockOnSync} />
    );

    // Should show time ago text (e.g., "Just now")
    expect(getByText(/now|ago/i)).toBeTruthy();
  });

  it('shows syncing state', () => {
    const state: SyncState = {
      status: 'syncing',
      lastSync: null,
      pendingChanges: 0,
      error: null,
    };

    const { getByText } = render(
      <SyncStatus state={state} onSync={mockOnSync} />
    );

    expect(getByText(/syncing/i)).toBeTruthy();
  });

  it('shows error state', () => {
    const state: SyncState = {
      status: 'error',
      lastSync: null,
      pendingChanges: 0,
      error: 'Connection failed',
    };

    const { getByText } = render(
      <SyncStatus state={state} onSync={mockOnSync} />
    );

    expect(getByText(/Connection failed/i)).toBeTruthy();
  });

  it('shows pending changes count', () => {
    const state: SyncState = {
      status: 'idle',
      lastSync: null,
      pendingChanges: 3,
      error: null,
    };

    const { getByText } = render(
      <SyncStatus state={state} onSync={mockOnSync} />
    );

    expect(getByText(/3 pending/i)).toBeTruthy();
  });

  it('calls onSync when tapped', () => {
    const state: SyncState = {
      status: 'idle',
      lastSync: null,
      pendingChanges: 0,
      error: null,
    };

    const { getByRole } = render(
      <SyncStatus state={state} onSync={mockOnSync} />
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(mockOnSync).toHaveBeenCalled();
  });

  it('disables tap during sync', () => {
    const state: SyncState = {
      status: 'syncing',
      lastSync: null,
      pendingChanges: 0,
      error: null,
    };

    const { getByRole } = render(
      <SyncStatus state={state} onSync={mockOnSync} />
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(mockOnSync).not.toHaveBeenCalled();
  });
});
