import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function CreateScreen() {
  useFocusEffect(
    useCallback(() => {
      // Navigate to recording flow when this tab is focused
      router.push('/story/recording');
    }, [])
  );

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
});
