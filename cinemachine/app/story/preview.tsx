import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, StoryGradients } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';

const { width } = Dimensions.get('window');

const previewShots = [
  { emoji: '🎬', title: 'Opening Scene', gradient: 0 },
  { emoji: '🌟', title: 'The Adventure', gradient: 1 },
  { emoji: '🎭', title: 'The Discovery', gradient: 2 },
  { emoji: '🎪', title: 'Grand Finale', gradient: 3 },
];

export default function PreviewScreen() {
  const { shotCount } = useLocalSearchParams<{ shotCount?: string }>();
  const insets = useSafeAreaInsets();
  const [currentShot, setCurrentShot] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSaved, setShowSaved] = useState(false);

  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const titleScale = useRef(new Animated.Value(0)).current;
  const savedOpacity = useRef(new Animated.Value(0)).current;

  const numShots = shotCount ? parseInt(shotCount, 10) : previewShots.length;
  const displayShots = previewShots.slice(0, Math.max(numShots, 1));

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
    if (!isPlaying) return;
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

  const handleSave = () => {
    setShowSaved(true);
    Animated.timing(savedOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);
  };

  const currentGradient =
    StoryGradients[
      displayShots[currentShot].gradient % StoryGradients.length
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
          <Text style={styles.movieTitle}>My Awesome Movie</Text>
        </Animated.View>

        {/* Shot display */}
        <Animated.View style={[styles.shotDisplay, { opacity: fadeOpacity }]}>
          <Text style={styles.shotEmoji}>
            {displayShots[currentShot].emoji}
          </Text>
          <Text style={styles.shotTitle}>
            {displayShots[currentShot].title}
          </Text>
        </Animated.View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {displayShots.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === currentShot
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
        <Text style={styles.creditsName}>Alex</Text>
      </View>

      {/* Save button */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {showSaved ? (
          <Animated.View style={[styles.savedBadge, { opacity: savedOpacity }]}>
            <Text style={styles.savedText}>✅ Saved to My Stories!</Text>
          </Animated.View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              Shadows.button,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>💾 Save to My Stories</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  saveButton: {
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
