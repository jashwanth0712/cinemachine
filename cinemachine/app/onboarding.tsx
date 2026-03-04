import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii, Shadows } from '../constants/spacing';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🎬',
    gradient: Colors.gradientSunset,
    title: 'Make Movies with Your Toys!',
    subtitle:
      'Turn your favorite toys into movie stars. Just play, talk, and record!',
  },
  {
    id: '2',
    emoji: '🗣️',
    gradient: Colors.gradientOcean,
    title: 'Your Voice is the Remote',
    subtitle:
      'No buttons needed! Just talk to your AI director buddy to create your story.',
  },
  {
    id: '3',
    emoji: '🌟',
    gradient: Colors.gradientGolden,
    title: 'Share Your Masterpiece',
    subtitle:
      'Watch your movie, earn badges, and become a real movie director!',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient
              colors={[item.gradient[0], item.gradient[1]]}
              style={styles.illustration}
            >
              <Text style={styles.slideEmoji}>{item.emoji}</Text>
            </LinearGradient>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            Shadows.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? "Let's Go!" : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
  },
  illustration: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: Radii.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  slideEmoji: {
    fontSize: 80,
  },
  slideTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  slideSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.lg,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: Spacing.lg,
  },
  bottomControls: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.orange,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.gray300,
  },
  button: {
    backgroundColor: Colors.orange,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
});
