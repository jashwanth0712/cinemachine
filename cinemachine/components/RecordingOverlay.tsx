import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii } from '../constants/spacing';
import { formatRecordingTime } from '../utils/formatters';

interface RecordingOverlayProps {
  time: number;
}

export default function RecordingOverlay({ time }: RecordingOverlayProps) {
  const borderOpacity = useRef(new Animated.Value(0.4)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(borderOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [borderOpacity, dotScale, containerOpacity]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Pulsing border */}
      <Animated.View style={[styles.border, { opacity: borderOpacity }]} />

      {/* Recording indicator */}
      <View style={styles.indicator}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale }] }]} />
        <Text style={styles.label}>REC</Text>
        <Text style={styles.timer}>{formatRecordingTime(time)}</Text>
      </View>

      {/* Tap to stop hint */}
      <View style={styles.stopHint}>
        <Text style={styles.stopText}>Tap to stop recording</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderRadius: 0,
    borderColor: 'rgba(255, 59, 48, 1)',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.black + '80',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    marginTop: 60,
    marginLeft: Spacing.xl,
    gap: Spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.recording,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.recording,
  },
  timer: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  stopHint: {
    alignSelf: 'center',
    backgroundColor: Colors.black + '60',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    marginBottom: 120,
  },
  stopText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
