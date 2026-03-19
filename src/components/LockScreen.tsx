import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Vibration,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSecurityStore } from '../stores/security';

/**
 * App lock screen overlay.
 * Supports PIN and biometric authentication.
 */
export function LockScreen(): React.ReactElement | null {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { isLocked, lockType, biometricAvailable, unlock, checkBiometric } = useSecurityStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';
  const errorColor = '#ef4444';

  useEffect(() => {
    // Auto-trigger biometric on mount if available
    if (isLocked && lockType === 'biometric' && biometricAvailable) {
      handleBiometric();
    }
  }, [isLocked]);

  const handleBiometric = async () => {
    setError(null);
    const success = await unlock();
    if (!success) {
      setError('Biometric authentication failed');
      Vibration.vibrate(100);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setError(null);
    const success = await unlock(pin);
    if (!success) {
      setAttempts((prev) => prev + 1);
      setError('Incorrect PIN');
      setPin('');
      Vibration.vibrate(100);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      // Auto-submit at 4+ digits
      if (newPin.length >= 4 && lockType === 'pin') {
        setTimeout(async () => {
          const success = await unlock(newPin);
          if (!success) {
            setAttempts((prev) => prev + 1);
            setError('Incorrect PIN');
            setPin('');
            Vibration.vibrate(100);
          }
        }, 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  if (!isLocked) {
    return null;
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Logo/Title */}
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={48} color={accentColor} />
        <Text style={[styles.title, { color: textColor }]}>Chronicle</Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>Enter PIN to unlock</Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.pinDots}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: mutedColor },
              pin.length > i && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
          />
        ))}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={[styles.error, { color: errorColor }]}>{error}</Text>
      )}
      {attempts >= 3 && (
        <Text style={[styles.warning, { color: mutedColor }]}>
          {5 - attempts} attempts remaining
        </Text>
      )}

      {/* Number Pad */}
      <View style={styles.numpad}>
        {digits.map((digit, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.numpadButton,
              digit === '' && styles.numpadEmpty,
            ]}
            onPress={() => {
              if (digit === 'del') handleBackspace();
              else if (digit !== '') handleDigitPress(digit);
            }}
            disabled={digit === ''}
          >
            {digit === 'del' ? (
              <Ionicons name="backspace-outline" size={24} color={textColor} />
            ) : (
              <Text style={[styles.numpadText, { color: textColor }]}>{digit}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Biometric Button */}
      {biometricAvailable && (
        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
          <Ionicons name="finger-print" size={32} color={accentColor} />
          <Text style={[styles.biometricText, { color: accentColor }]}>
            Use Biometrics
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  pinDots: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 8,
  },
  error: {
    fontSize: 14,
    marginBottom: 8,
  },
  warning: {
    fontSize: 12,
    marginBottom: 16,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    marginTop: 20,
  },
  numpadButton: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadEmpty: {
    opacity: 0,
  },
  numpadText: {
    fontSize: 28,
    fontWeight: '500',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    padding: 12,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
