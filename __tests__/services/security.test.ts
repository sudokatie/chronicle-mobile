import {
  isAppLocked,
  lock,
} from '../../src/services/security';

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock storage service
jest.mock('../../src/services/storage', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

describe('security service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAppLocked', () => {
    it('returns current lock state', () => {
      const locked = isAppLocked();
      expect(typeof locked).toBe('boolean');
    });
  });

  describe('lock', () => {
    it('sets app to locked state', () => {
      lock();
      expect(isAppLocked()).toBe(true);
    });
  });
});
