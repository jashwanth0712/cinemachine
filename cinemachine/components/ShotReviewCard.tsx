import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii, Shadows } from '../constants/spacing';
import { formatDuration } from '../utils/formatters';
import type { RecordedShot } from '../hooks/useStoryRecording';

interface ShotReviewCardProps {
  shot: RecordedShot;
  onKeep: () => void;
  onRedo: () => void;
}

export default function ShotReviewCard({ shot, onKeep, onRedo }: ShotReviewCardProps) {
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 15,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={[styles.card, Shadows.card]}>
        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewEmoji}>{shot.emoji}</Text>
          <View>
            <Text style={styles.previewTitle}>{shot.title}</Text>
            <Text style={styles.previewDuration}>
              {formatDuration(shot.duration)}
            </Text>
          </View>
        </View>

        {/* Agent dialogue */}
        <Text style={styles.dialogue}>
          That was amazing! Keep this shot or try again?
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.redoButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onRedo}
          >
            <Text style={styles.redoText}>🔄 Redo</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.keepButton,
              Shadows.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={onKeep}
          >
            <Text style={styles.keepText}>✅ Keep it!</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.cream,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  previewEmoji: {
    fontSize: 40,
  },
  previewTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.navy,
  },
  previewDuration: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray400,
    marginTop: 2,
  },
  dialogue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.navy,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  redoButton: {
    backgroundColor: Colors.gray200,
  },
  keepButton: {
    backgroundColor: Colors.orange,
  },
  redoText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.gray500,
  },
  keepText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
