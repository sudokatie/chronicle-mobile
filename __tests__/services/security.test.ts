// Mock expo-local-authentication
const mockHasHardwareAsync = jest.fn();
const mockIsEnrolledAsync = jest.fn();
const mockAuthenticateAsync = jest.fn();
const mockSupportedAuthTypesAsync = jest.fn();

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: () => mockHasHardwareAsync(),
  isEnrolledAsync: () => mockIsEnrolledAsync(),
  authenticateAsync: (opts: unknown) => mockAuthenticateAsync(opts),
  supportedAuthenticationTypesAsync: () => mockSupportedAuthTypesAsync(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock expo-secure-store
const mockSecureStoreGet = jest.fn();
const mockSecureStoreSet = jest.fn();
const mockSecureStoreDelete = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => mockSecureStoreGet(key),
  setItemAsync: (key: string, value: string) => mockSecureStoreSet(key, value),
  deleteItemAsync: (key: string) => mockSecureStoreDelete(key),
}));

// Mock storage service
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();

jest.mock('../../src/services/storage', () => ({
  getSetting: (key: string) => mockGetSetting(key),
  setSetting: (key: string, value: unknown) => mockSetSetting(key, value),
}));

import * as securityService from '../../src/services/security';

describe('security service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(undefined);
    mockSecureStoreGet.mockResolvedValue(null);
    mockSecureStoreSet.mockResolvedValue(undefined);
    mockSecureStoreDelete.mockResolvedValue(undefined);
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    mockSupportedAuthTypesAsync.mockResolvedValue([1]);
  });

  describe('isAppLocked', () => {
    it('returns current lock state', () => {
      const locked = securityService.isAppLocked();
      expect(typeof locked).toBe('boolean');
    });
  });

  describe('lock', () => {
    it('sets app to locked state', () => {
      securityService.lock();
      expect(securityService.isAppLocked()).toBe(true);
    });

    it('notifies listeners on lock', () => {
      const listener = jest.fn();
      const unsubscribe = securityService.onLockStateChange(listener);

      securityService.lock();

      expect(listener).toHaveBeenCalledWith(true);
      unsubscribe();
    });
  });

  describe('unlockWithPin', () => {
    it('unlocks with correct PIN', async () => {
      mockSecureStoreGet.mockResolvedValue('1234');

      const result = await securityService.unlockWithPin('1234');

      expect(result).toBe(true);
      expect(securityService.isAppLocked()).toBe(false);
    });

    it('fails with incorrect PIN', async () => {
      mockSecureStoreGet.mockResolvedValue('1234');

      const result = await securityService.unlockWithPin('9999');

      expect(result).toBe(false);
    });

    it('fails when no PIN is set', async () => {
      mockSecureStoreGet.mockResolvedValue(null);

      const result = await securityService.unlockWithPin('1234');

      expect(result).toBe(false);
    });
  });

  describe('unlockWithBiometric', () => {
    it('unlocks on successful biometric auth', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      const result = await securityService.unlockWithBiometric();

      expect(result).toBe(true);
      expect(securityService.isAppLocked()).toBe(false);
    });

    it('fails on biometric auth failure', async () => {
      securityService.lock();
      mockAuthenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

      const result = await securityService.unlockWithBiometric();

      expect(result).toBe(false);
      expect(securityService.isAppLocked()).toBe(true);
    });

    it('passes correct prompt message', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      await securityService.unlockWithBiometric();

      expect(mockAuthenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Unlock Chronicle',
        })
      );
    });
  });

  describe('unlock', () => {
    it('unlocks immediately when lock type is none', async () => {
      mockGetSetting.mockResolvedValue('none');

      const result = await securityService.unlock();

      expect(result).toBe(true);
    });

    it('tries biometric first when lock type is biometric', async () => {
      mockGetSetting.mockResolvedValue('biometric');
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      const result = await securityService.unlock();

      expect(result).toBe(true);
      expect(mockAuthenticateAsync).toHaveBeenCalled();
    });

    it('falls back to PIN if biometric fails and PIN provided', async () => {
      mockGetSetting.mockResolvedValue('biometric');
      mockAuthenticateAsync.mockResolvedValue({ success: false });
      mockSecureStoreGet.mockResolvedValue('5678');

      const result = await securityService.unlock('5678');

      expect(result).toBe(true);
    });
  });

  describe('setLockType', () => {
    it('saves lock type to settings', async () => {
      await securityService.setLockType('pin');

      expect(mockSetSetting).toHaveBeenCalledWith('lockType', 'pin');
      expect(mockSetSetting).toHaveBeenCalledWith('lockEnabled', true);
    });

    it('disables lock and clears PIN when set to none', async () => {
      await securityService.setLockType('none');

      expect(mockSetSetting).toHaveBeenCalledWith('lockType', 'none');
      expect(mockSetSetting).toHaveBeenCalledWith('lockEnabled', false);
      expect(mockSecureStoreDelete).toHaveBeenCalledWith('app_pin');
    });
  });

  describe('setPin', () => {
    it('stores PIN securely', async () => {
      await securityService.setPin('1234');

      expect(mockSecureStoreSet).toHaveBeenCalledWith('app_pin', '1234');
    });

    it('rejects PIN shorter than 4 digits', async () => {
      await expect(securityService.setPin('123')).rejects.toThrow('PIN must be at least 4 digits');
    });

    it('accepts longer PINs', async () => {
      await securityService.setPin('123456');

      expect(mockSecureStoreSet).toHaveBeenCalledWith('app_pin', '123456');
    });
  });

  describe('hasPinSet', () => {
    it('returns true when PIN is stored', async () => {
      mockSecureStoreGet.mockResolvedValue('1234');

      const result = await securityService.hasPinSet();

      expect(result).toBe(true);
    });

    it('returns false when no PIN stored', async () => {
      mockSecureStoreGet.mockResolvedValue(null);

      const result = await securityService.hasPinSet();

      expect(result).toBe(false);
    });
  });

  describe('isBiometricAvailable', () => {
    it('returns true when hardware and enrollment present', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);

      const result = await securityService.isBiometricAvailable();

      expect(result).toBe(true);
    });

    it('returns false when no hardware', async () => {
      mockHasHardwareAsync.mockResolvedValue(false);

      const result = await securityService.isBiometricAvailable();

      expect(result).toBe(false);
    });

    it('returns false when not enrolled', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(false);

      const result = await securityService.isBiometricAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getBiometricTypes', () => {
    it('returns supported authentication types', async () => {
      mockSupportedAuthTypesAsync.mockResolvedValue([1, 2]);

      const types = await securityService.getBiometricTypes();

      expect(types).toEqual([1, 2]);
    });
  });

  describe('checkBiometric', () => {
    it('verifies biometric authentication works', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      const result = await securityService.checkBiometric();

      expect(result).toBe(true);
    });

    it('returns false when biometric not available', async () => {
      mockHasHardwareAsync.mockResolvedValue(false);

      const result = await securityService.checkBiometric();

      expect(result).toBe(false);
    });

    it('returns false when verification fails', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockAuthenticateAsync.mockResolvedValue({ success: false });

      const result = await securityService.checkBiometric();

      expect(result).toBe(false);
    });
  });

  describe('setLockTimeout', () => {
    it('saves timeout to settings', async () => {
      await securityService.setLockTimeout(300000);

      expect(mockSetSetting).toHaveBeenCalledWith('lockTimeout', 300000);
    });
  });

  describe('getLockTimeout', () => {
    it('returns stored timeout', async () => {
      mockGetSetting.mockResolvedValue(300000);

      const timeout = await securityService.getLockTimeout();

      expect(timeout).toBe(300000);
    });

    it('returns default timeout when not set', async () => {
      mockGetSetting.mockResolvedValue(null);

      const timeout = await securityService.getLockTimeout();

      expect(timeout).toBe(60000);
    });
  });

  describe('onLockStateChange', () => {
    it('subscribes to lock state changes', () => {
      const listener = jest.fn();
      const unsubscribe = securityService.onLockStateChange(listener);

      securityService.lock();

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('returns working unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = securityService.onLockStateChange(listener);

      unsubscribe();
      listener.mockClear();

      securityService.lock();

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsub1 = securityService.onLockStateChange(listener1);
      const unsub2 = securityService.onLockStateChange(listener2);

      securityService.lock();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      unsub1();
      unsub2();
    });
  });

  describe('initSecurity', () => {
    it('sets locked state based on lockEnabled setting', async () => {
      mockGetSetting.mockResolvedValue(true);

      await securityService.initSecurity();

      expect(securityService.isAppLocked()).toBe(true);
    });

    it('unlocks when lockEnabled is false', async () => {
      mockGetSetting.mockResolvedValue(false);

      await securityService.initSecurity();

      expect(securityService.isAppLocked()).toBe(false);
    });
  });

  describe('clearSecurityData', () => {
    it('removes all security data', async () => {
      await securityService.clearSecurityData();

      expect(mockSecureStoreDelete).toHaveBeenCalledWith('app_pin');
      expect(mockSetSetting).toHaveBeenCalledWith('lockType', 'none');
      expect(mockSetSetting).toHaveBeenCalledWith('lockEnabled', false);
      expect(securityService.isAppLocked()).toBe(false);
    });
  });
});
