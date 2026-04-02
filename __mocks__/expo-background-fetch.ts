// Mock for expo-background-fetch

export const BackgroundFetchResult = {
  NoData: 1,
  NewData: 2,
  Failed: 3,
};

export const BackgroundFetchStatus = {
  Denied: 1,
  Restricted: 2,
  Available: 3,
};

export const registerTaskAsync = jest.fn().mockResolvedValue(undefined);
export const unregisterTaskAsync = jest.fn().mockResolvedValue(undefined);
export const getStatusAsync = jest.fn().mockResolvedValue(3);
export const setMinimumIntervalAsync = jest.fn().mockResolvedValue(undefined);

export default {
  BackgroundFetchResult,
  BackgroundFetchStatus,
  registerTaskAsync,
  unregisterTaskAsync,
  getStatusAsync,
  setMinimumIntervalAsync,
};
