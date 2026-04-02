import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSyncStore } from '../../src/stores/sync';
import { useSecurityStore } from '../../src/stores/security';
import { getSetting, setSetting, isEncryptionEnabled, setEncryptionEnabled } from '../../src/services/storage';
import { clearCredentials } from '../../src/services/git';
import { clearSecurityData, setLockTimeout, getLockTimeout } from '../../src/services/security';
import { SyncStatus } from '../../src/components/SyncStatus';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

/**
 * Settings screen with sync, security, storage, and about sections.
 */
export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { state: syncState, startSync } = useSyncStore();
  const { lockType, biometricAvailable, setLockType } = useSecurityStore();

  const [autoSync, setAutoSync] = useState(true);
  const [vaultPath, setVaultPath] = useState<string>('');
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [lockTimeout, setLockTimeoutState] = useState<number>(60000);
  const [encryptionOn, setEncryptionOn] = useState(false);

  // Timeout options in milliseconds
  const TIMEOUT_OPTIONS = [
    { label: 'Immediately', value: 0 },
    { label: '30 seconds', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '5 minutes', value: 300000 },
    { label: '15 minutes', value: 900000 },
    { label: '30 minutes', value: 1800000 },
    { label: 'Never', value: -1 },
  ];

  const backgroundColor = isDark ? '#09090b' : '#f4f4f5';
  const cardBg = isDark ? '#18181b' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';
  const dangerColor = '#ef4444';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const autoSyncVal = await getSetting<boolean>('autoSync');
    const vaultPathVal = await getSetting<string>('vaultPath');
    const remoteUrlVal = await getSetting<string>('remoteUrl');
    const timeoutVal = await getLockTimeout();
    const encryptionVal = await isEncryptionEnabled();

    setAutoSync(autoSyncVal ?? true);
    setVaultPath(vaultPathVal || '');
    setRemoteUrl(remoteUrlVal || '');
    setLockTimeoutState(timeoutVal);
    setEncryptionOn(encryptionVal);
  };

  const handleAutoSyncToggle = async (value: boolean) => {
    setAutoSync(value);
    await setSetting('autoSync', value);
  };

  const handleLockTimeoutChange = () => {
    Alert.alert(
      'Auto-Lock Timeout',
      'Lock the app after inactivity',
      [
        ...TIMEOUT_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: async () => {
            setLockTimeoutState(opt.value);
            await setLockTimeout(opt.value);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getLockTimeoutLabel = (): string => {
    const opt = TIMEOUT_OPTIONS.find((o) => o.value === lockTimeout);
    return opt?.label || '1 minute';
  };

  const handleEncryptionToggle = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Encryption',
        'This will encrypt sensitive data stored locally. Make sure you have a backup of your vault.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              await setEncryptionEnabled(true);
              setEncryptionOn(true);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Disable Encryption',
        'New data will be stored unencrypted. Existing encrypted data will remain encrypted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await setEncryptionEnabled(false);
              setEncryptionOn(false);
            },
          },
        ]
      );
    }
  };

  const handleLockTypeChange = async () => {
    const options: Array<{ text: string; value: 'none' | 'pin' | 'biometric' }> = [
      { text: 'No Lock', value: 'none' },
      { text: 'PIN Code', value: 'pin' },
    ];

    if (biometricAvailable) {
      options.push({ text: 'Biometric', value: 'biometric' });
    }

    Alert.alert(
      'App Lock',
      'Choose how to protect your vault',
      [
        ...options.map((opt) => ({
          text: opt.text,
          onPress: () => {
            if (opt.value === 'pin') {
              router.push('/onboarding/security');
            } else {
              setLockType(opt.value);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all local data including cached notes. Your remote repository will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await clearCredentials();
            await clearSecurityData();
            await setSetting('onboarded', false);
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  const getLockTypeLabel = (): string => {
    switch (lockType) {
      case 'biometric':
        return 'Biometric';
      case 'pin':
        return 'PIN Code';
      default:
        return 'None';
    }
  };

  function SettingRow({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger,
  }: SettingRowProps): React.ReactElement {
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: borderColor }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <Ionicons
          name={icon}
          size={22}
          color={danger ? dangerColor : accentColor}
          style={styles.rowIcon}
        />
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, { color: danger ? dangerColor : textColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.rowSubtitle, { color: mutedColor }]}>{subtitle}</Text>
          )}
        </View>
        {rightElement || (onPress && (
          <Ionicons name="chevron-forward" size={20} color={mutedColor} />
        ))}
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* Sync Status */}
      <SyncStatus state={syncState} onSync={startSync} />

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: mutedColor }]}>SYNC</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <SettingRow
            icon="cloud"
            title="Remote Repository"
            subtitle={remoteUrl || 'Not configured'}
            onPress={() => router.push('/onboarding/git-setup')}
          />
          <SettingRow
            icon="sync"
            title="Auto Sync"
            subtitle="Sync automatically when app opens"
            rightElement={
              <Switch
                value={autoSync}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: borderColor, true: accentColor }}
              />
            }
          />
          <SettingRow
            icon="refresh"
            title="Sync Now"
            subtitle={syncState.lastSync ? `Last: ${syncState.lastSync.toLocaleTimeString()}` : 'Never synced'}
            onPress={startSync}
          />
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: mutedColor }]}>SECURITY</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <SettingRow
            icon="lock-closed"
            title="App Lock"
            subtitle={getLockTypeLabel()}
            onPress={handleLockTypeChange}
          />
          {lockType !== 'none' && (
            <SettingRow
              icon="timer"
              title="Auto-Lock Timeout"
              subtitle={getLockTimeoutLabel()}
              onPress={handleLockTimeoutChange}
            />
          )}
          <SettingRow
            icon="shield-checkmark"
            title="Encrypt Local Data"
            subtitle="Encrypt sensitive settings and credentials"
            rightElement={
              <Switch
                value={encryptionOn}
                onValueChange={handleEncryptionToggle}
                trackColor={{ false: borderColor, true: accentColor }}
              />
            }
          />
        </View>
      </View>

      {/* Storage Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: mutedColor }]}>STORAGE</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <SettingRow
            icon="folder"
            title="Vault Location"
            subtitle={vaultPath ? vaultPath.split('/').pop() || 'vault' : 'Not set'}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: mutedColor }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <SettingRow
            icon="information-circle"
            title="Version"
            subtitle="1.0.0"
          />
          <SettingRow
            icon="logo-github"
            title="Source Code"
            subtitle="github.com/chronicle/mobile"
          />
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: dangerColor }]}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <SettingRow
            icon="trash"
            title="Clear All Data"
            subtitle="Remove local data and reset app"
            onPress={handleClearData}
            danger
          />
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
