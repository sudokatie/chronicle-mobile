import { Redirect } from 'expo-router';

export default function Index() {
  // TODO: Check if onboarded, redirect accordingly
  return <Redirect href="/(tabs)/notes" />;
}
