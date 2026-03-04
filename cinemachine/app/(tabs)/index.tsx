import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { dummyStories, dummyUserProfile } from '../../constants/dummyData';
import StoryCard from '../../components/StoryCard';
import EmptyState from '../../components/EmptyState';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const stories = dummyStories;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {dummyUserProfile.name}! 👋
          </Text>
          <Text style={styles.subtitle}>Ready to make a movie?</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{dummyUserProfile.avatar}</Text>
        </View>
      </View>

      {/* Stories */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>My Stories</Text>
        {stories.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.storyList}>
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating New Story Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          Shadows.button,
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/story/recording')}
      >
        <Text style={styles.fabIcon}>✨</Text>
        <Text style={styles.fabText}>New Story</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xl,
    color: Colors.navy,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  storyList: {
    gap: Spacing.lg,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    gap: Spacing.sm,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
