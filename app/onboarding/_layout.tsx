import { Stack } from 'expo-router';

/**
 * Onboarding stack layout.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="git-setup" />
      <Stack.Screen name="security" />
    </Stack>
  );
}
