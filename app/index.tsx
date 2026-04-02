import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { Redirect } from 'expo-router';
import { initDatabase, getSetting } from '../src/services/storage';
import { initSecurity } from '../src/services/security';
import { initSync } from '../src/services/sync';

type RouteState = 'loading' | 'onboarding' | 'main';

/**
 * Root index - checks onboarding status and redirects accordingly.
 */
export default function Index(): React.ReactElement {
  const [routeState, setRouteState] = useState<RouteState>('loading');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const spinnerColor = isDark ? '#60a5fa' : '#2563eb';

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Initialize core services
      await initDatabase();
      await initSecurity();
      await initSync();

      // Check if user has completed onboarding
      const onboarded = await getSetting<boolean>('onboarded');

      if (onboarded) {
        setRouteState('main');
      } else {
        setRouteState('onboarding');
      }
    } catch (error) {
      // If anything fails, assume not onboarded
      console.error('Initialization error:', error);
      setRouteState('onboarding');
    }
  };

  // Show loading spinner while checking
  if (routeState === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color={spinnerColor} />
      </View>
    );
  }

  // Redirect based on onboarding status
  if (routeState === 'onboarding') {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <Redirect href="/(tabs)/notes" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
