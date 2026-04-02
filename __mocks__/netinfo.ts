// Mock for @react-native-community/netinfo

export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

export type NetInfoState = {
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export type NetInfoSubscription = () => void;

const mockState: NetInfoState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
};

export const fetch = jest.fn().mockResolvedValue(mockState);
export const refresh = jest.fn().mockResolvedValue(mockState);
export const addEventListener = jest.fn().mockReturnValue(jest.fn());
export const useNetInfo = jest.fn().mockReturnValue(mockState);

export default {
  NetInfoStateType,
  fetch,
  refresh,
  addEventListener,
  useNetInfo,
};
