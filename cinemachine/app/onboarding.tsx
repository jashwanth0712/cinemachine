import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { Spacing, Radii, Shadows } from '../constants/spacing';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_CLIENT_ID } from '../services/auth';

const IOS_CLIENT_ID = '684023745855-9e9lsh5p0uo812bav2jh62sopnlg8olq.apps.googleusercontent.com';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Onboarding slides
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Emoji picker data
// ---------------------------------------------------------------------------

const AVATAR_EMOJIS = [
  '🎬', '🌟', '🐉', '🦄', '🚀', '🧸', '🎨', '🎭',
  '🦕', '🐱', '🐶', '🐼', '🦊', '🐸', '🐙', '🦋',
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type Step = 'carousel' | 'signing_in' | 'create_kid';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn, createKidProfile } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<Step>(
    isAuthenticated ? 'create_kid' : 'carousel'
  );
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingKid, setIsCreatingKid] = useState(false);
  const [kidName, setKidName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎬');

  const flatListRef = useRef<FlatList>(null);

  // Reversed client ID used as iOS redirect scheme
  const reversedClientId = IOS_CLIENT_ID.split('.').reverse().join('.');
  const iosRedirectUri = `${reversedClientId}:/oauthredirect`;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      // Last slide — start Google sign-in
      await handleGoogleSignIn();
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setStep('signing_in');
    try {
      // PKCE: generate code_verifier and code_challenge
      const codeVerifier = Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2);
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      // Base64url encode (replace +/ with -_, strip =)
      const codeChallenge = digest
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const params = new URLSearchParams({
        client_id: IOS_CLIENT_ID,
        redirect_uri: iosRedirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, iosRedirectUri);

      if (result.type === 'success' && result.url) {
        // Auth code is in the query params
        const url = new URL(result.url);
        const code = url.searchParams.get('code') ||
          new URLSearchParams(result.url.split('?')[1] || '').get('code');

        if (code) {
          // Exchange code for tokens (no client_secret needed for iOS + PKCE)
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: IOS_CLIENT_ID,
              code,
              code_verifier: codeVerifier,
              grant_type: 'authorization_code',
              redirect_uri: iosRedirectUri,
            }).toString(),
          });
          const tokenData = await tokenRes.json();

          if (tokenData.id_token) {
            const success = await signIn(tokenData.id_token);
            if (success) {
              setStep('create_kid');
              return;
            }
          } else {
            console.error('[Auth] Token exchange failed:', tokenData);
          }
        }
        Alert.alert('Sign In', 'Sign-in failed. Please try again.');
        setStep('carousel');
      } else {
        Alert.alert('Sign In', 'Sign-in was cancelled. Please try again.');
        setStep('carousel');
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      Alert.alert('Error', 'Something went wrong during sign-in.');
      setStep('carousel');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateKid = async () => {
    const trimmedName = kidName.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', "Please enter your kid's name.");
      return;
    }
    setIsCreatingKid(true);
    try {
      await createKidProfile(trimmedName, selectedEmoji);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Create kid profile error:', err);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setIsCreatingKid(false);
    }
  };

  // -----------------------------------------------------------------------
  // Signing-in screen
  // -----------------------------------------------------------------------

  if (step === 'signing_in') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.signingInContainer}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.signingInText}>Signing in...</Text>
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Create kid profile screen
  // -----------------------------------------------------------------------

  if (step === 'create_kid') {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.createKidContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.createKidTitle}>Create a Profile</Text>
        <Text style={styles.createKidSubtitle}>
          Who is the movie director?
        </Text>

        {/* Selected avatar */}
        <LinearGradient
          colors={[Colors.orange, Colors.salmon]}
          style={styles.avatarPreview}
        >
          <Text style={styles.avatarPreviewEmoji}>{selectedEmoji}</Text>
        </LinearGradient>

        {/* Name input */}
        <TextInput
          style={styles.nameInput}
          placeholder="Director's name"
          placeholderTextColor={Colors.gray400}
          value={kidName}
          onChangeText={setKidName}
          autoCapitalize="words"
          returnKeyType="done"
          maxLength={20}
        />

        {/* Emoji picker */}
        <Text style={styles.pickEmojiLabel}>Pick an avatar</Text>
        <View style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              style={[
                styles.emojiOption,
                emoji === selectedEmoji && styles.emojiOptionSelected,
              ]}
              onPress={() => setSelectedEmoji(emoji)}
            >
              <Text style={styles.emojiOptionText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* Create button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            Shadows.button,
            pressed && styles.buttonPressed,
            isCreatingKid && styles.buttonDisabled,
          ]}
          onPress={handleCreateKid}
          disabled={isCreatingKid}
        >
          {isCreatingKid ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Start Making Movies!</Text>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  // -----------------------------------------------------------------------
  // Carousel
  // -----------------------------------------------------------------------

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
      <View
        style={[
          styles.bottomControls,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
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
            isSigningIn && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? "Let's Go!" : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },

  // Signing in
  signingInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  signingInText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray500,
  },

  // Create kid profile
  createKidContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    paddingBottom: 60,
  },
  createKidTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
    marginBottom: Spacing.sm,
  },
  createKidSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.lg,
    color: Colors.gray500,
    marginBottom: Spacing.xxl,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  avatarPreviewEmoji: {
    fontSize: 48,
  },
  nameInput: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.soft,
  },
  pickEmojiLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  emojiOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    ...Shadows.soft,
  },
  emojiOptionSelected: {
    backgroundColor: Colors.orange + '20',
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  emojiOptionText: {
    fontSize: 28,
  },
});
