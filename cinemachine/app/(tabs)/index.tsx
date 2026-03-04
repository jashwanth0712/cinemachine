import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import type { Story } from '../../types';
import StoryCard from '../../components/StoryCard';
import EmptyState from '../../components/EmptyState';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentKid, token } = useAuth();

  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch stories
  // -----------------------------------------------------------------------

  const fetchStories = useCallback(async () => {
    if (!token || !currentKid) {
      setStories([]);
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.getStories(token, currentKid.id);
      setStories(data);
    } catch (err) {
      console.warn('Failed to fetch stories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentKid]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchStories();
    setIsRefreshing(false);
  }, [fetchStories]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const kidName = currentKid?.name ?? 'Director';
  const kidAvatar = currentKid?.avatar_emoji ?? '🎬';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {kidName}! 👋</Text>
          <Text style={styles.subtitle}>Ready to make a movie?</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{kidAvatar}</Text>
        </View>
      </View>

      {/* Stories */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.orange}
          />
        }
      >
        <Text style={styles.sectionTitle}>My Stories</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.orange} />
          </View>
        ) : stories.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.storyList}>
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating New Story Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          Shadows.button,
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/story/recording')}
      >
        <Text style={styles.fabIcon}>✨</Text>
        <Text style={styles.fabText}>New Story</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xl,
    color: Colors.navy,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  storyList: {
    gap: Spacing.lg,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    gap: Spacing.sm,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    fontSize: 18,
  },
  fabText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
