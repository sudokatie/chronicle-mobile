import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getSetting, setSetting } from './storage';

// Secure storage keys
const PIN_KEY = 'app_pin';
const LOCK_TIMEOUT_KEY = 'lock_timeout_ms';

// Lock state
let isLocked = true;
let lockTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivity = Date.now();

// State change listeners
const listeners: Set<(locked: boolean) => void> = new Set();

/**
 * Notify listeners of lock state change.
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener(isLocked);
  }
}

/**
 * Subscribe to lock state changes.
 */
export function onLockStateChange(callback: (locked: boolean) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Check if app is currently locked.
 */
export function isAppLocked(): boolean {
  return isLocked;
}

/**
 * Lock the app.
 */
export function lock(): void {
  isLocked = true;
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
  notifyListeners();
}

/**
 * Attempt to unlock with PIN.
 */
export async function unlockWithPin(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(PIN_KEY);
  if (storedPin && pin === storedPin) {
    isLocked = false;
    resetLockTimer();
    notifyListeners();
    return true;
  }
  return false;
}

/**
 * Attempt to unlock with biometrics.
 */
export async function unlockWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Chronicle',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  });

  if (result.success) {
    isLocked = false;
    resetLockTimer();
    notifyListeners();
    return true;
  }
  return false;
}

/**
 * Unified unlock attempt (tries biometric first if enabled, then falls back).
 */
export async function unlock(credential?: string): Promise<boolean> {
  const lockType = await getSetting<string>('lockType') || 'none';

  if (lockType === 'none') {
    isLocked = false;
    notifyListeners();
    return true;
  }

  if (lockType === 'biometric') {
    const biometricResult = await unlockWithBiometric();
    if (biometricResult) return true;
    // Fall through to PIN if biometric fails and PIN is provided
  }

  if (credential) {
    return unlockWithPin(credential);
  }

  return false;
}

/**
 * Set the lock type.
 */
export async function setLockType(type: 'none' | 'pin' | 'biometric'): Promise<void> {
  await setSetting('lockType', type);
  await setSetting('lockEnabled', type !== 'none');

  if (type === 'none') {
    isLocked = false;
    notifyListeners();
    // Clear stored PIN when disabling lock
    await SecureStore.deleteItemAsync(PIN_KEY);
  }
}

/**
 * Set or update the PIN.
 */
export async function setPin(pin: string): Promise<void> {
  if (pin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

/**
 * Check if PIN is set.
 */
export async function hasPinSet(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return !!pin;
}

/**
 * Check if biometric authentication is available.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Get supported biometric types.
 */
export async function getBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
  return LocalAuthentication.supportedAuthenticationTypesAsync();
}

/**
 * Verify biometric works (for setup).
 */
export async function checkBiometric(): Promise<boolean> {
  if (!(await isBiometricAvailable())) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Verify biometrics',
    fallbackLabel: 'Cancel',
    disableDeviceFallback: true,
  });

  return result.success;
}

/**
 * Set auto-lock timeout in milliseconds.
 */
export async function setLockTimeout(timeoutMs: number): Promise<void> {
  await setSetting('lockTimeout', timeoutMs);
}

/**
 * Get auto-lock timeout.
 */
export async function getLockTimeout(): Promise<number> {
  const timeout = await getSetting<number>('lockTimeout');
  return timeout || 60000; // Default 1 minute
}

/**
 * Reset the auto-lock timer.
 */
export async function resetLockTimer(): Promise<void> {
  lastActivity = Date.now();

  if (lockTimer) {
    clearTimeout(lockTimer);
  }

  const lockType = await getSetting<string>('lockType');
  if (!lockType || lockType === 'none') {
    return;
  }

  const timeout = await getLockTimeout();
  if (timeout > 0) {
    lockTimer = setTimeout(() => {
      lock();
    }, timeout);
  }
}

/**
 * Record user activity (resets auto-lock timer).
 */
export function recordActivity(): void {
  resetLockTimer();
}

/**
 * Initialize security service (call on app startup).
 */
export async function initSecurity(): Promise<void> {
  const lockEnabled = await getSetting<boolean>('lockEnabled');

  if (lockEnabled) {
    isLocked = true;
  } else {
    isLocked = false;
  }

  notifyListeners();
}

/**
 * Clear all security data (for logout/reset).
 */
export async function clearSecurityData(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await setSetting('lockType', 'none');
  await setSetting('lockEnabled', false);
  isLocked = false;
  notifyListeners();
}
