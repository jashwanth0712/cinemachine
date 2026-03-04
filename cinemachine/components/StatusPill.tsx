import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii } from '../constants/spacing';

interface StatusPillProps {
  text: string;
  variant?: 'default' | 'recording' | 'success';
}

export default function StatusPill({ text, variant = 'default' }: StatusPillProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.stop();
    }

    if (variant === 'recording') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animRef.current = anim;
      anim.start();
    } else {
      opacity.setValue(1);
    }

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [variant, opacity]);

  const bgColor =
    variant === 'recording'
      ? Colors.recording
      : variant === 'success'
        ? Colors.success
        : Colors.navy;

  return (
    <View style={[styles.pill, { backgroundColor: bgColor + '22' }]}>
      <Animated.View
        style={[styles.dot, { backgroundColor: bgColor, opacity }]}
      />
      <Text style={[styles.text, { color: bgColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    gap: Spacing.sm,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
});
