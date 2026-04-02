import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuickCapture } from '../src/components/QuickCapture';

// Mock expo dependencies
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          recording: {
            stopAndUnloadAsync: jest.fn(),
            getURI: () => 'file://test-recording.m4a',
          },
        })
      ),
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file://test-image.jpg',
          width: 100,
          height: 100,
          mimeType: 'image/jpeg',
        },
      ],
    })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file://test-image.jpg',
          width: 100,
          height: 100,
          mimeType: 'image/jpeg',
        },
      ],
    })
  ),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://documents/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/services/storage', () => ({
  getSetting: jest.fn(() => Promise.resolve('file://vault')),
}));

describe('QuickCapture', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByPlaceholderText, getByText } = render(
      <QuickCapture onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(getByPlaceholderText('Note title...')).toBeTruthy();
    expect(getByPlaceholderText('Start typing your note...')).toBeTruthy();
    expect(getByText('Quick Note')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('allows entering title and content', () => {
    const { getByPlaceholderText } = render(
      <QuickCapture onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const titleInput = getByPlaceholderText('Note title...');
    const contentInput = getByPlaceholderText('Start typing your note...');

    fireEvent.changeText(titleInput, 'Test Title');
    fireEvent.changeText(contentInput, 'Test Content');

    expect(titleInput.props.value).toBe('Test Title');
    expect(contentInput.props.value).toBe('Test Content');
  });

  it('calls onCancel when Cancel is pressed', () => {
    const { getByText } = render(
      <QuickCapture onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    fireEvent.press(getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onSubmit with data when Save is pressed', async () => {
    const { getByPlaceholderText, getByText } = render(
      <QuickCapture onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    fireEvent.changeText(getByPlaceholderText('Note title...'), 'My Note');
    fireEvent.changeText(getByPlaceholderText('Start typing your note...'), 'Note content');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'My Note',
        content: 'Note content',
        attachments: [],
      });
    });
  });

  it('shows alert when trying to save empty note', () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    
    const { getByText } = render(
      <QuickCapture onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    fireEvent.press(getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Empty Note',
      'Please add some content to your note.'
    );
  });

  it('renders with initial content', () => {
    const { getByPlaceholderText, getByDisplayValue } = render(
      <QuickCapture
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialTitle="Initial Title"
        initialContent="Initial content"
      />
    );

    expect(getByDisplayValue('Initial Title')).toBeTruthy();
    expect(getByDisplayValue('Initial content')).toBeTruthy();
  });

  it('hides title input when showTitle is false', () => {
    const { queryByPlaceholderText, getByPlaceholderText } = render(
      <QuickCapture
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        showTitle={false}
      />
    );

    expect(queryByPlaceholderText('Note title...')).toBeNull();
    expect(getByPlaceholderText('Start typing your note...')).toBeTruthy();
  });
});

describe('QuickCapture attachments', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows action buttons for camera and gallery', () => {
    const { UNSAFE_getAllByType } = render(
      <QuickCapture onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Check that the action bar contains the expected buttons
    // This is a simplified check - in real tests you might use testID
    const TouchableOpacity = require('react-native').TouchableOpacity;
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    
    // Should have Cancel, Save, mic, camera, and gallery buttons
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });
});
