import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, StoryGradients } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { dummyStories } from '../../constants/dummyData';
import { formatDuration } from '../../utils/formatters';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const story = dummyStories.find((s) => s.id === id);

  if (!story) {
    return (
      <View style={styles.container}>
        <Text>Story not found</Text>
      </View>
    );
  }

  const gradient = StoryGradients[story.gradientIndex % StoryGradients.length];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        style={[styles.hero, { paddingTop: insets.top + Spacing.lg }]}
      >
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.heroEmoji}>{story.emoji}</Text>
        <Text style={styles.heroTitle}>{story.title}</Text>
        <Text style={styles.heroMeta}>
          {story.shots.length} shots · {formatDuration(story.totalDuration)}
        </Text>
      </LinearGradient>

      {/* Info */}
      <View style={styles.infoSection}>
        <Text style={styles.description}>{story.description}</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Character</Text>
            <Text style={styles.detailValue}>{story.character}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Setting</Text>
            <Text style={styles.detailValue}>{story.setting}</Text>
          </View>
        </View>
      </View>

      {/* Shots */}
      <View style={styles.shotsSection}>
        <Text style={styles.sectionTitle}>Shots</Text>
        {story.shots.map((shot, index) => (
          <View key={shot.id} style={[styles.shotCard, Shadows.soft]}>
            <View style={styles.shotNumber}>
              <Text style={styles.shotNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.shotEmoji}>{shot.emoji}</Text>
            <View style={styles.shotInfo}>
              <Text style={styles.shotTitle}>{shot.title}</Text>
              <Text style={styles.shotDesc}>{shot.description}</Text>
            </View>
            <Text style={styles.shotDuration}>
              {formatDuration(shot.duration)}
            </Text>
          </View>
        ))}
      </View>

      {/* Play Button */}
      <Pressable
        style={({ pressed }) => [
          styles.playButton,
          Shadows.button,
          pressed && styles.playButtonPressed,
        ]}
        onPress={() =>
          router.push({ pathname: '/story/preview', params: { id: story.id } })
        }
      >
        <Text style={styles.playButtonText}>▶ Play Movie</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: Radii.xxl,
    borderBottomRightRadius: Radii.xxl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  heroEmoji: {
    fontSize: 72,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
  },
  heroMeta: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.md,
    color: Colors.white + 'CC',
    marginTop: Spacing.sm,
  },
  infoSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.lg,
    color: Colors.gray500,
    lineHeight: 28,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detailItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  detailLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.navy,
  },
  shotsSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xl,
    color: Colors.navy,
    marginBottom: Spacing.lg,
  },
  shotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  shotNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotNumberText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    color: Colors.orange,
  },
  shotEmoji: {
    fontSize: 28,
  },
  shotInfo: {
    flex: 1,
    gap: 2,
  },
  shotTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.navy,
  },
  shotDesc: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  shotDuration: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  playButton: {
    backgroundColor: Colors.orange,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  playButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
});
