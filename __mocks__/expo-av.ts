// Mock for expo-av
export const Audio = {
  Recording: class {
    _uri = '/mock/recording.m4a';
    _duration = 1000;
    async prepareToRecordAsync() { return { canRecord: true }; }
    async startAsync() { return { isRecording: true }; }
    async stopAndUnloadAsync() { return { isDoneRecording: true }; }
    async pauseAsync() { return { isRecording: false }; }
    async getStatusAsync() { return { isRecording: false, durationMillis: this._duration }; }
    getURI() { return this._uri; }
  },
  Sound: {
    createAsync: jest.fn().mockResolvedValue({
      sound: {
        playAsync: jest.fn(),
        pauseAsync: jest.fn(),
        unloadAsync: jest.fn(),
        setPositionAsync: jest.fn(),
        getStatusAsync: jest.fn().mockResolvedValue({ isLoaded: true, positionMillis: 0 }),
      },
      status: { isLoaded: true },
    }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  RecordingOptionsPresets: {
    HIGH_QUALITY: {},
  },
};
