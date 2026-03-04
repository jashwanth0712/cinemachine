import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii, Shadows } from '../constants/spacing';
import { useAuth } from '../context/AuthContext';

export default function SelectProfileScreen() {
  const insets = useSafeAreaInsets();
  const { kidProfiles, setCurrentKid } = useAuth();

  const handleSelectProfile = (kid: (typeof kidProfiles)[number]) => {
    setCurrentKid(kid);
    router.replace('/(tabs)');
  };

  const handleCreateProfile = () => {
    router.push('/onboarding');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xxl }]}>
      <Text style={styles.title}>Who's watching?</Text>

      <View style={styles.grid}>
        {kidProfiles.map((kid) => (
          <Pressable
            key={kid.id}
            style={({ pressed }) => [
              styles.card,
              Shadows.soft,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleSelectProfile(kid)}
          >
            <LinearGradient
              colors={[Colors.orange, Colors.salmon]}
              style={styles.avatar}
            >
              <Text style={styles.avatarEmoji}>{kid.avatar_emoji}</Text>
            </LinearGradient>
            <Text style={styles.kidName}>{kid.name}</Text>
          </Pressable>
        ))}

        {/* Create Profile card */}
        <Pressable
          style={({ pressed }) => [
            styles.card,
            Shadows.soft,
            pressed && styles.cardPressed,
          ]}
          onPress={handleCreateProfile}
        >
          <View style={styles.addAvatar}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.kidName}>Create Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
    marginBottom: Spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  card: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  addAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 36,
    color: Colors.gray400,
    fontFamily: Fonts.bold,
  },
  kidName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.navy,
  },
});
