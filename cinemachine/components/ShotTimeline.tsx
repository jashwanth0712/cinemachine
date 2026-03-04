import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii, Shadows } from '../constants/spacing';
import type { RecordedShot } from '../hooks/useStoryRecording';

interface ShotTimelineProps {
  shots: RecordedShot[];
}

function ShotThumb({ shot, index }: { shot: RecordedShot; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateX, index]);

  return (
    <Animated.View
      style={[
        styles.shotThumb,
        Shadows.soft,
        { opacity, transform: [{ translateX }] },
      ]}
    >
      <Text style={styles.shotEmoji}>{shot.emoji}</Text>
      <Text style={styles.shotLabel}>Shot {index + 1}</Text>
    </Animated.View>
  );
}

export default function ShotTimeline({ shots }: ShotTimelineProps) {
  if (shots.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {shots.map((shot, index) => (
          <ShotThumb key={shot.id} shot={shot} index={index} />
        ))}
        {/* Next shot placeholder */}
        <View style={styles.nextShot}>
          <Text style={styles.nextShotPlus}>+</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  shotThumb: {
    width: 64,
    height: 64,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  shotEmoji: {
    fontSize: 24,
  },
  shotLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.gray400,
  },
  nextShot: {
    width: 64,
    height: 64,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.white + '60',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextShotPlus: {
    fontSize: 24,
    color: Colors.white + '80',
    fontFamily: Fonts.bold,
  },
});
