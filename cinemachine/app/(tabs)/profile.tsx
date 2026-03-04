import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { Spacing, Radii, Shadows } from '../../constants/spacing';
import { dummyUserProfile } from '../../constants/dummyData';
import { formatDuration } from '../../utils/formatters';

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
  const profile = dummyUserProfile;
  const earnedBadges = profile.badges.filter((b) => b.earned).length;

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
          <Text style={styles.avatarLargeEmoji}>{profile.avatar}</Text>
        </LinearGradient>
        <Text style={styles.name}>{profile.name}</Text>
        <View style={styles.titleBadge}>
          <Text style={styles.titleText}>{profile.title}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Stats</Text>
      <View style={styles.statsGrid}>
        <StatCard value={String(profile.storiesCount)} label="Stories" />
        <StatCard value={String(profile.totalShots)} label="Shots" />
        <StatCard
          value={formatDuration(profile.totalDuration)}
          label="Total Time"
        />
        <StatCard
          value={`${earnedBadges}/${profile.badges.length}`}
          label="Badges"
        />
      </View>

      {/* Badges */}
      <Text style={styles.sectionTitle}>Badges</Text>
      <View style={styles.badgesRow}>
        {profile.badges.map((badge) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
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
});
