import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing } from '../constants/spacing';

const { width, height } = Dimensions.get('window');

const confettiEmojis = ['🎉', '⭐', '🌟', '✨', '🎬', '🏆', '🎊', '💫'];

interface ConfettiPiece {
  emoji: string;
  x: number;
  delay: number;
}

const confetti: ConfettiPiece[] = Array.from({ length: 20 }, (_, i) => ({
  emoji: confettiEmojis[i % confettiEmojis.length],
  x: Math.random() * (width - 40),
  delay: Math.random() * 1500,
}));

function ConfettiItem({ piece }: { piece: ConfettiPiece }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(piece.delay),
        Animated.timing(translateY, {
          toValue: height + 60,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(piece.delay),
        Animated.loop(
          Animated.timing(rotate, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ),
      ]),
      Animated.sequence([
        Animated.delay(piece.delay + 2000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [translateY, opacity, rotate, piece.delay]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.Text
      style={[
        styles.confetti,
        { left: piece.x },
        {
          transform: [{ translateY }, { rotate: spin }],
          opacity,
        },
      ]}
    >
      {piece.emoji}
    </Animated.Text>
  );
}

export default function CelebrationOverlay() {
  const titleScale = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.delay(300),
      Animated.sequence([
        Animated.spring(titleScale, {
          toValue: 1.2,
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [titleScale, containerOpacity]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Confetti */}
      {confetti.map((piece, i) => (
        <ConfettiItem key={i} piece={piece} />
      ))}

      {/* Center content */}
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale: titleScale }] }}>
          <Text style={styles.trophy}>🏆</Text>
        </Animated.View>
        <Text style={styles.title}>That's a Wrap!</Text>
        <Text style={styles.subtitle}>Your movie is ready to watch!</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black + '70',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    top: -60,
    fontSize: 28,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  trophy: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxxl,
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.lg,
    color: Colors.white + 'CC',
    textAlign: 'center',
  },
});
