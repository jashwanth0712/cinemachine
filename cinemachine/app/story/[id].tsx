import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, StoryGradients } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { formatDuration } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import type { Story } from '../../types';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.getStory(token, id);
        setStory(data);
      } catch (err) {
        console.warn('Failed to fetch story:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token, id]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Story not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const gradient =
    StoryGradients[story.gradient_index % StoryGradients.length];
  const shots = story.shots ?? [];
  const totalDuration =
    story.total_duration ??
    shots.reduce((sum, s) => sum + s.duration_seconds, 0);

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
          {shots.length} shots · {formatDuration(totalDuration)}
        </Text>
      </LinearGradient>

      {/* Info */}
      <View style={styles.infoSection}>
        {story.description ? (
          <Text style={styles.description}>{story.description}</Text>
        ) : null}

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Character</Text>
            <Text style={styles.detailValue}>
              {story.character_name ?? 'TBD'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Setting</Text>
            <Text style={styles.detailValue}>
              {story.setting ?? 'TBD'}
            </Text>
          </View>
        </View>
      </View>

      {/* Shots */}
      {shots.length > 0 && (
        <View style={styles.shotsSection}>
          <Text style={styles.sectionTitle}>Shots</Text>
          {shots.map((shot, index) => (
            <View key={shot.id} style={[styles.shotCard, Shadows.soft]}>
              <View style={styles.shotNumber}>
                <Text style={styles.shotNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.shotEmoji}>{shot.emoji}</Text>
              <View style={styles.shotInfo}>
                <Text style={styles.shotTitle}>{shot.title}</Text>
                {shot.description ? (
                  <Text style={styles.shotDesc}>{shot.description}</Text>
                ) : null}
              </View>
              <Text style={styles.shotDuration}>
                {formatDuration(shot.duration_seconds)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Play Button */}
      <Pressable
        style={({ pressed }) => [
          styles.playButton,
          Shadows.button,
          pressed && styles.playButtonPressed,
        ]}
        onPress={() =>
          router.push({
            pathname: '/story/preview',
            params: { id: story.id },
          })
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  backLink: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.orange,
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
