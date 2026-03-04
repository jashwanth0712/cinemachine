import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { formatDuration } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import type { KidProfileStats, Badge } from '../../types';

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={[styles.statCard, Shadows.soft]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentKid, token, signOut, kidProfiles } = useAuth();

  const [profile, setProfile] = useState<KidProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!token || !currentKid) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.getKidProfile(token, currentKid.id);
      setProfile(data);
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentKid]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Fallback if profile couldn't be loaded
  // -----------------------------------------------------------------------

  const name = profile?.name ?? currentKid?.name ?? 'Director';
  const avatar = profile?.avatar_emoji ?? currentKid?.avatar_emoji ?? '🎬';
  const title = profile?.title ?? currentKid?.title ?? 'Movie Director';
  const storiesCount = profile?.stories_count ?? 0;
  const totalShots = profile?.total_shots ?? 0;
  const totalDuration = profile?.total_duration ?? 0;
  const badges: Badge[] = profile?.badges ?? [];
  const earnedBadges = badges.filter((b) => b.earned).length;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={[Colors.orange, Colors.salmon]}
          style={styles.avatarLarge}
        >
          <Text style={styles.avatarLargeEmoji}>{avatar}</Text>
        </LinearGradient>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.titleBadge}>
          <Text style={styles.titleText}>{title}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Stats</Text>
      <View style={styles.statsGrid}>
        <StatCard value={String(storiesCount)} label="Stories" />
        <StatCard value={String(totalShots)} label="Shots" />
        <StatCard
          value={formatDuration(totalDuration)}
          label="Total Time"
        />
        <StatCard
          value={badges.length > 0 ? `${earnedBadges}/${badges.length}` : '0'}
          label="Badges"
        />
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesRow}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  !badge.earned && styles.badgeItemUnearned,
                ]}
              >
                <Text
                  style={[
                    styles.badgeEmoji,
                    !badge.earned && styles.badgeEmojiUnearned,
                  ]}
                >
                  {badge.emoji}
                </Text>
                <Text
                  style={[
                    styles.badgeLabel,
                    !badge.earned && styles.badgeLabelUnearned,
                  ]}
                >
                  {badge.title}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Switch Profile */}
      {kidProfiles.length >= 2 && (
        <Pressable
          style={({ pressed }) => [
            styles.switchProfileButton,
            pressed && styles.signOutPressed,
          ]}
          onPress={() => router.replace('/select-profile')}
        >
          <Text style={styles.switchProfileText}>Switch Profile</Text>
        </Pressable>
      )}

      {/* Sign out */}
      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.signOutPressed,
        ]}
        onPress={signOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeEmoji: {
    fontSize: 48,
  },
  name: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
  },
  titleBadge: {
    backgroundColor: Colors.orange + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  titleText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.orange,
  },
  sectionTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xl,
    color: Colors.navy,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.xxl,
    color: Colors.navy,
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray400,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  badgeItem: {
    alignItems: 'center',
    width: 80,
    gap: Spacing.xs,
  },
  badgeItemUnearned: {
    opacity: 0.4,
  },
  badgeEmoji: {
    fontSize: 36,
  },
  badgeEmojiUnearned: {
    opacity: 0.5,
  },
  badgeLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.navy,
    textAlign: 'center',
  },
  badgeLabelUnearned: {
    color: Colors.gray400,
  },
  switchProfileButton: {
    marginTop: Spacing.xxl,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Colors.orange + '20',
  },
  switchProfileText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.orange,
  },
  signOutButton: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Colors.gray200,
  },
  signOutPressed: {
    opacity: 0.7,
  },
  signOutText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.gray500,
  },
});
