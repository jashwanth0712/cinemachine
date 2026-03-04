import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, StoryGradients } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii, Shadows } from '../constants/spacing';
import { formatDuration, formatDate, formatShotCount } from '../utils/formatters';
import type { Story } from '../types';

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  const gradient = StoryGradients[story.gradient_index % StoryGradients.length];
  const shotCount = story.shot_count ?? story.shots?.length ?? 0;
  const totalDuration =
    story.total_duration ??
    (story.shots?.reduce((sum, s) => sum + s.duration_seconds, 0) ?? 0);

  return (
    <Pressable
      onPress={() => router.push(`/story/${story.id}`)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumbnail}
      >
        <Text style={styles.emoji}>{story.emoji}</Text>
      </LinearGradient>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
        {story.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {story.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {formatShotCount(shotCount)}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>
            {formatDuration(totalDuration)}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatDate(story.created_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.lg,
    ...Shadows.card,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.navy,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.gray400,
  },
  metaDot: {
    color: Colors.gray300,
    fontSize: FontSizes.xs,
  },
});
