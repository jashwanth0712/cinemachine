import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

export default function Index() {
  const { isLoading, isAuthenticated, currentKid, kidProfiles, hasPickedProfile } = useAuth();

  // Still restoring session from SecureStore
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  // Not signed in — send to onboarding (which now handles sign-in)
  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  // Signed in but no kid profiles yet — let them create one
  if (kidProfiles.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  // Multiple profiles and hasn't picked yet — show profile picker
  if (kidProfiles.length >= 2 && !hasPickedProfile) {
    return <Redirect href="/select-profile" />;
  }

  // Single profile auto-selected, or profile already picked — go to tabs
  if (currentKid) {
    return <Redirect href="/(tabs)" />;
  }

  // Fallback: shouldn't normally reach here
  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },
});
