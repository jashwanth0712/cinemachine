import { Redirect } from 'expo-router';

export default function Index() {
  // In a real app, check if onboarding is completed
  // For demo, skip straight to tabs
  return <Redirect href="/(tabs)" />;
}
