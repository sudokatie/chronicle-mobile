// Mock for expo-local-authentication

export const AuthenticationType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
};

export const hasHardwareAsync = jest.fn().mockResolvedValue(true);
export const isEnrolledAsync = jest.fn().mockResolvedValue(true);
export const authenticateAsync = jest.fn().mockResolvedValue({ success: true });
export const supportedAuthenticationTypesAsync = jest.fn().mockResolvedValue([1]);

export default {
  AuthenticationType,
  hasHardwareAsync,
  isEnrolledAsync,
  authenticateAsync,
  supportedAuthenticationTypesAsync,
};
