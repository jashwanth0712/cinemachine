import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii } from '../constants/spacing';
import AnimatedOrb from './AnimatedOrb';
import VoiceCommandBadge from './VoiceCommandBadge';

interface VoiceAgentOverlayProps {
  dialogue: string;
  hint?: string;
  isListening?: boolean;
}

export default function VoiceAgentOverlay({
  dialogue,
  hint,
  isListening = true,
}: VoiceAgentOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {/* Orb */}
      <View style={styles.orbContainer}>
        <AnimatedOrb isActive={isListening} size={70} />
      </View>

      {/* Dialogue bubble */}
      <View style={styles.dialogueBubble}>
        <Text style={styles.dialogueText}>{dialogue}</Text>
      </View>

      {/* Hint */}
      {hint && <VoiceCommandBadge text={hint} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 120,
    gap: Spacing.xl,
  },
  orbContainer: {
    marginBottom: Spacing.md,
  },
  dialogueBubble: {
    backgroundColor: Colors.white + 'E6',
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
    maxWidth: '85%',
  },
  dialogueText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.navy,
    textAlign: 'center',
    lineHeight: 28,
  },
});
