import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii } from '../constants/spacing';

interface VoiceCommandBadgeProps {
  text: string;
}

export default function VoiceCommandBadge({ text }: VoiceCommandBadgeProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY, opacity]);

  return (
    <Animated.View style={[styles.badge, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.white + 'E6',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    alignSelf: 'center',
  },
  text: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.navy,
  },
});
