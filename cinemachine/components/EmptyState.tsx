import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing } from '../constants/spacing';

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎥</Text>
      <Text style={styles.title}>No stories yet!</Text>
      <Text style={styles.subtitle}>
        Tap the camera button below to create your first movie
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 24,
  },
});
