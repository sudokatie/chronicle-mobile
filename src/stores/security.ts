import { create } from 'zustand';
import * as securityService from '../services/security';
import { getSetting } from '../services/storage';

interface SecurityStore {
  isLocked: boolean;
  lockType: 'none' | 'pin' | 'biometric';
  biometricAvailable: boolean;

  // Actions
  initialize: () => Promise<void>;
  unlock: (credential?: string) => Promise<boolean>;
  lock: () => void;
  setLockType: (type: 'none' | 'pin' | 'biometric') => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  checkBiometric: () => Promise<boolean>;
  recordActivity: () => void;
}

export const useSecurityStore = create<SecurityStore>((set, get) => ({
  isLocked: true,
  lockType: 'none',
  biometricAvailable: false,

  initialize: async () => {
    await securityService.initSecurity();

    // Get current settings
    const lockType = (await getSetting<string>('lockType')) as 'none' | 'pin' | 'biometric' || 'none';
    const biometricAvailable = await securityService.isBiometricAvailable();

    // Subscribe to lock state changes
    securityService.onLockStateChange((locked) => {
      set({ isLocked: locked });
    });

    set({
      isLocked: securityService.isAppLocked(),
      lockType,
      biometricAvailable,
    });
  },

  unlock: async (credential?: string) => {
    const success = await securityService.unlock(credential);
    if (success) {
      set({ isLocked: false });
    }
    return success;
  },

  lock: () => {
    securityService.lock();
    set({ isLocked: true });
  },

  setLockType: async (type: 'none' | 'pin' | 'biometric') => {
    await securityService.setLockType(type);
    set({ lockType: type });
  },

  setPin: async (pin: string) => {
    await securityService.setPin(pin);
  },

  checkBiometric: async () => {
    return securityService.checkBiometric();
  },

  recordActivity: () => {
    securityService.recordActivity();
  },
}));
