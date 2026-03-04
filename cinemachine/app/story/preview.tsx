import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, StoryGradients } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import type { Story, Shot } from '../../types';

const { width } = Dimensions.get('window');

// Fallback shots for when no real data is available
const fallbackShots = [
  { emoji: '🎬', title: 'Opening Scene', gradient: 0 },
  { emoji: '🌟', title: 'The Adventure', gradient: 1 },
  { emoji: '🎭', title: 'The Discovery', gradient: 2 },
  { emoji: '🎪', title: 'Grand Finale', gradient: 3 },
];

export default function PreviewScreen() {
  const { id, shotCount } = useLocalSearchParams<{
    id?: string;
    shotCount?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { token, currentKid } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(!!id);
  const [currentShot, setCurrentShot] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const titleScale = useRef(new Animated.Value(0)).current;
  const savedOpacity = useRef(new Animated.Value(0)).current;

  // -----------------------------------------------------------------------
  // Fetch story from API if we have an id
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!id || !token) {
      setIsLoadingStory(false);
      return;
    }
    (async () => {
      try {
        const data = await api.getStory(token, id);
        setStory(data);
      } catch (err) {
        console.warn('Failed to fetch story for preview:', err);
      } finally {
        setIsLoadingStory(false);
      }
    })();
  }, [id, token]);

  // -----------------------------------------------------------------------
  // Derive display shots
  // -----------------------------------------------------------------------

  const displayShots: { emoji: string; title: string; gradient: number }[] =
    story?.shots && story.shots.length > 0
      ? story.shots.map((s: Shot, i: number) => ({
          emoji: s.emoji,
          title: s.title,
          gradient: i % StoryGradients.length,
        }))
      : shotCount
        ? fallbackShots.slice(0, Math.max(parseInt(shotCount, 10), 1))
        : fallbackShots;

  const movieTitle = story?.title ?? 'My Awesome Movie';
  const directorName = currentKid?.name ?? 'Director';

  // -----------------------------------------------------------------------
  // Animations
  // -----------------------------------------------------------------------

  // Title entrance animation
  useEffect(() => {
    Animated.sequence([
      Animated.delay(500),
      Animated.sequence([
        Animated.spring(titleScale, {
          toValue: 1.1,
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [titleScale]);

  // Auto-play through shots
  useEffect(() => {
    if (!isPlaying || displayShots.length === 0) return;
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentShot((prev) => (prev + 1) % displayShots.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isPlaying, displayShots.length, fadeOpacity]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (token && story?.id) {
      setIsSaving(true);
      try {
        await api.updateStory(token, story.id, { status: 'complete' });
      } catch (err) {
        console.warn('Failed to update story status:', err);
      }
      setIsSaving(false);
    }

    setShowSaved(true);
    Animated.timing(savedOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);
  }, [token, story, savedOpacity]);

  const handleExport = useCallback(async () => {
    if (!token || !story?.id) return;
    setIsExporting(true);
    try {
      const { export_url } = await api.exportStory(token, story.id);
      Alert.alert('Export Ready', `Your movie has been exported!\n${export_url}`);
    } catch (err) {
      console.warn('Export failed:', err);
      Alert.alert('Export Failed', 'Could not export your movie. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [token, story]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (isLoadingStory) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={[StoryGradients[0][0], StoryGradients[0][1]]}
          style={styles.background}
        />
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const safeIndex = currentShot % Math.max(displayShots.length, 1);
  const currentGradient =
    StoryGradients[
      displayShots[safeIndex]?.gradient ?? 0 % StoryGradients.length
    ];

  return (
    <View style={styles.container}>
      {/* Background gradient transitions */}
      <LinearGradient
        colors={[currentGradient[0], currentGradient[1]]}
        style={styles.background}
      />

      {/* Player area */}
      <View style={[styles.playerArea, { paddingTop: insets.top + Spacing.xl }]}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {/* Movie title */}
        <Animated.View style={{ transform: [{ scale: titleScale }] }}>
          <Text style={styles.movieTitle}>{movieTitle}</Text>
        </Animated.View>

        {/* Shot display */}
        <Animated.View style={[styles.shotDisplay, { opacity: fadeOpacity }]}>
          <Text style={styles.shotEmoji}>
            {displayShots[safeIndex]?.emoji ?? '🎬'}
          </Text>
          <Text style={styles.shotTitle}>
            {displayShots[safeIndex]?.title ?? ''}
          </Text>
        </Animated.View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {displayShots.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === safeIndex
                  ? styles.progressDotActive
                  : styles.progressDotInactive,
              ]}
            />
          ))}
        </View>

        {/* Play/pause toggle */}
        <Pressable
          style={styles.playPause}
          onPress={() => setIsPlaying(!isPlaying)}
        >
          <Text style={styles.playPauseText}>
            {isPlaying ? '⏸' : '▶️'}
          </Text>
        </Pressable>
      </View>

      {/* Credits */}
      <View style={styles.credits}>
        <Text style={styles.creditsLabel}>Directed by</Text>
        <Text style={styles.creditsName}>{directorName}</Text>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {showSaved ? (
          <Animated.View style={[styles.savedBadge, { opacity: savedOpacity }]}>
            <Text style={styles.savedText}>✅ Saved to My Stories!</Text>
          </Animated.View>
        ) : (
          <View style={styles.buttonRow}>
            {/* Save button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                Shadows.button,
                pressed && styles.saveButtonPressed,
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.orange} />
              ) : (
                <Text style={styles.saveButtonText}>💾 Save</Text>
              )}
            </Pressable>

            {/* Export button (only if we have a real story) */}
            {story?.id && (
              <Pressable
                style={({ pressed }) => [
                  styles.exportButton,
                  pressed && styles.exportButtonPressed,
                ]}
                onPress={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.exportButtonText}>📤 Export</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  playerArea: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xl,
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
  movieTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  shotDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  shotEmoji: {
    fontSize: 100,
  },
  shotTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.white,
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: Colors.white,
  },
  progressDotInactive: {
    width: 12,
    backgroundColor: Colors.white + '50',
  },
  playPause: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  playPauseText: {
    fontSize: 24,
  },
  credits: {
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.xl,
  },
  creditsLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.white + '80',
  },
  creditsName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  bottomControls: {
    paddingHorizontal: Spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.orange,
  },
  exportButton: {
    flex: 1,
    backgroundColor: Colors.orange,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
    ...Shadows.button,
  },
  exportButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  exportButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  savedBadge: {
    backgroundColor: Colors.success + '20',
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  savedText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.success,
  },
});
