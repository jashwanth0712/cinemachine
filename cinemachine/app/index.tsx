import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

export default function Index() {
  const { isLoading, isAuthenticated, currentKid, kidProfiles } = useAuth();

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
  if (kidProfiles.length === 0 || !currentKid) {
    return <Redirect href="/onboarding" />;
  }

  // All good — go to the main tabs
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },
});
