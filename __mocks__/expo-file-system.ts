// Mock for expo-file-system

export const documentDirectory = '/mock/documents/';
export const cacheDirectory = '/mock/cache/';

export const readAsStringAsync = jest.fn().mockResolvedValue('');
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const getInfoAsync = jest.fn().mockResolvedValue({
  exists: true,
  isDirectory: false,
  uri: '/mock/file',
  size: 100,
  modificationTime: Date.now() / 1000,
});
export const readDirectoryAsync = jest.fn().mockResolvedValue([]);
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const copyAsync = jest.fn().mockResolvedValue(undefined);
export const moveAsync = jest.fn().mockResolvedValue(undefined);

// Paths namespace (expo-file-system v18+)
export const Paths = {
  document: { uri: '/mock/documents/' },
  cache: { uri: '/mock/cache/' },
};

// FileSystem namespace mock for named imports
const FileSystem = {
  documentDirectory,
  cacheDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  readDirectoryAsync,
  makeDirectoryAsync,
  copyAsync,
  moveAsync,
  Paths,
};

export default FileSystem;
