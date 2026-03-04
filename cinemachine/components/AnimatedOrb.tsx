import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../constants/colors';

interface AnimatedOrbProps {
  isActive: boolean;
  size?: number;
}

export default function AnimatedOrb({ isActive, size = 80 }: AnimatedOrbProps) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.2)).current;
  const opacity3 = useRef(new Animated.Value(0.1)).current;

  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.stop();
    }

    if (isActive) {
      const anim = Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(scale1, { toValue: 1.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale1, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(scale2, { toValue: 1.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale2, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(scale3, { toValue: 1.8, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale3, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity1, { toValue: 0.5, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity1, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(opacity2, { toValue: 0.35, duration: 1000, useNativeDriver: true }),
            Animated.timing(opacity2, { toValue: 0.15, duration: 1000, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(opacity3, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
            Animated.timing(opacity3, { toValue: 0.05, duration: 1200, useNativeDriver: true }),
          ])
        ),
      ]);
      animRef.current = anim;
      anim.start();
    } else {
      const anim = Animated.parallel([
        Animated.timing(scale1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scale2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scale3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity1, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity2, { toValue: 0.1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity3, { toValue: 0.05, duration: 300, useNativeDriver: true }),
      ]);
      animRef.current = anim;
      anim.start();
    }

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [isActive, scale1, scale2, scale3, opacity1, opacity2, opacity3]);

  const orbSize = size;
  const ringBase = {
    position: 'absolute' as const,
    width: orbSize,
    height: orbSize,
    borderRadius: orbSize / 2,
    backgroundColor: Colors.orange,
  };

  return (
    <Animated.View style={[styles.container, { width: orbSize * 2, height: orbSize * 2 }]}>
      <Animated.View style={[ringBase, { transform: [{ scale: scale3 }], opacity: opacity3 }]} />
      <Animated.View style={[ringBase, { transform: [{ scale: scale2 }], opacity: opacity2 }]} />
      <Animated.View style={[ringBase, { transform: [{ scale: scale1 }], opacity: opacity1 }]} />
      <Animated.View
        style={[
          {
            width: orbSize * 0.6,
            height: orbSize * 0.6,
            borderRadius: orbSize * 0.3,
            backgroundColor: Colors.orange,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
