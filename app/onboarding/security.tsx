import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSecurityStore } from '../../src/stores/security';
import { setSetting } from '../../src/services/storage';
import { isBiometricAvailable } from '../../src/services/security';

type LockOption = 'none' | 'pin' | 'biometric';

/**
 * Security setup screen - final step of onboarding.
 */
export default function SecuritySetupScreen(): React.ReactElement {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { setLockType, setPin, checkBiometric } = useSecurityStore();

  const [selectedOption, setSelectedOption] = useState<LockOption>('none');
  const [pinValue, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const cardBg = isDark ? '#18181b' : '#f4f4f5';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handleOptionSelect = (option: LockOption) => {
    setSelectedOption(option);
    if (option === 'pin') {
      setStep('pin');
    }
  };

  const handlePinSubmit = async () => {
    if (pinValue.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }

    if (!confirmPin) {
      // First entry - ask for confirmation
      setConfirmPin(pinValue);
      setPinValue('');
      return;
    }

    if (pinValue !== confirmPin) {
      Alert.alert('Error', 'PINs do not match. Try again.');
      setConfirmPin('');
      setPinValue('');
      return;
    }

    // PINs match - save and continue
    await setPin(pinValue);
    await setLockType('pin');
    await completeOnboarding();
  };

  const handleBiometricSetup = async () => {
    const success = await checkBiometric();
    if (success) {
      await setLockType('biometric');
      await completeOnboarding();
    } else {
      Alert.alert('Error', 'Biometric verification failed. Try again or choose a different option.');
    }
  };

  const handleSkipSecurity = async () => {
    await setLockType('none');
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    await setSetting('onboarded', true);
    router.replace('/(tabs)/notes');
  };

  const handleContinue = async () => {
    if (selectedOption === 'none') {
      await handleSkipSecurity();
    } else if (selectedOption === 'biometric') {
      await handleBiometricSetup();
    } else if (selectedOption === 'pin') {
      setStep('pin');
    }
  };

  // PIN Entry Screen
  if (step === 'pin') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('select')}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
              <Ionicons name="keypad" size={40} color={accentColor} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>
              {confirmPin ? 'Confirm Your PIN' : 'Create a PIN'}
            </Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              {confirmPin ? 'Enter your PIN again to confirm' : 'Choose a 4-6 digit PIN'}
            </Text>
          </View>

          {/* PIN Dots */}
          <View style={styles.pinDots}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { borderColor: mutedColor },
                  pinValue.length > i && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
              />
            ))}
          </View>

          {/* Hidden input for PIN */}
          <TextInput
            style={styles.hiddenInput}
            value={pinValue}
            onChangeText={(text) => {
              if (/^\d*$/.test(text) && text.length <= 6) {
                setPinValue(text);
              }
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: accentColor },
              pinValue.length < 4 && styles.buttonDisabled,
            ]}
            onPress={handlePinSubmit}
            disabled={pinValue.length < 4}
          >
            <Text style={styles.buttonText}>
              {confirmPin ? 'Set PIN' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Option Selection Screen
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
            <Ionicons name="shield-checkmark" size={40} color={accentColor} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>Secure Your Notes</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            Choose how you want to protect your vault
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {biometricAvailable && (
            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: cardBg, borderColor },
                selectedOption === 'biometric' && { borderColor: accentColor, borderWidth: 2 },
              ]}
              onPress={() => handleOptionSelect('biometric')}
            >
              <Ionicons name="finger-print" size={32} color={accentColor} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: textColor }]}>Biometric</Text>
                <Text style={[styles.optionDescription, { color: mutedColor }]}>
                  Face ID or Touch ID
                </Text>
              </View>
              {selectedOption === 'biometric' && (
                <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: cardBg, borderColor },
              selectedOption === 'pin' && { borderColor: accentColor, borderWidth: 2 },
            ]}
            onPress={() => handleOptionSelect('pin')}
          >
            <Ionicons name="keypad" size={32} color={accentColor} />
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: textColor }]}>PIN Code</Text>
              <Text style={[styles.optionDescription, { color: mutedColor }]}>
                4-6 digit passcode
              </Text>
            </View>
            {selectedOption === 'pin' && (
              <Ionicons name="checkmark-circle" size={24} color={accentColor} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: cardBg, borderColor },
              selectedOption === 'none' && { borderColor: accentColor, borderWidth: 2 },
            ]}
            onPress={() => handleOptionSelect('none')}
          >
            <Ionicons name="lock-open" size={32} color={mutedColor} />
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: textColor }]}>No Lock</Text>
              <Text style={[styles.optionDescription, { color: mutedColor }]}>
                Not recommended
              </Text>
            </View>
            {selectedOption === 'none' && (
              <Ionicons name="checkmark-circle" size={24} color={accentColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
