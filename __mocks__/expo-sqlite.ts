// Mock for expo-sqlite

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
  runAsync: jest.fn().mockResolvedValue(undefined),
  execAsync: jest.fn().mockResolvedValue(undefined),
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);

export default {
  openDatabaseAsync,
};
