import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { CompactAssigneeRating } from '@/features/appointments/detail/components/CompactAssigneeRating';
import type { RdvMaquetteCounterparty } from '@/utils/rdv-maquette-card-display';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

/** Ligne intervenant — compact (legacy) ou pied de carte (avatar + nom). */
const AVATAR_BY_SIZE = { compact: 28, footer: 36 } as const;
const ASSIGNMENT_LABEL = 'Assignation en cours';
const DOT_SIZE = 5;
const DOT_STAGGER_MS = 180;
const DOT_CYCLE_MS = 480;

interface Props {
  person: RdvMaquetteCounterparty;
  blurred?: boolean;
  seed?: string;
  /** `footer` = pied de carte liste RDV (plus visible). */
  size?: keyof typeof AVATAR_BY_SIZE;
}

function AssignmentPulseDots() {
  const c = useAppColors();
  const styles = useThemedStyles(buildPendingStyles);

  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
      {[0, 1, 2].map((index) => (
        <AssignmentDot key={index} index={index} color={c.primary} />
      ))}
    </View>
  );
}

function AssignmentDot({ index, color }: { index: number; color: string }) {
  const scale = useSharedValue(0.72);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withDelay(
      index * DOT_STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_CYCLE_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0.72, { duration: DOT_CYCLE_MS, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      index * DOT_STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_CYCLE_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0.35, { duration: DOT_CYCLE_MS, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [index, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

function AssignmentPendingRow({ size }: { size: keyof typeof AVATAR_BY_SIZE }) {
  const styles = useThemedStyles((c) => buildPendingStyles(c, size));
  const labelOpacity = useSharedValue(0.72);

  useEffect(() => {
    labelOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.72, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [labelOpacity]);

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <View style={styles.pendingRow} accessibilityRole="text" accessibilityLabel={ASSIGNMENT_LABEL}>
      <AssignmentPulseDots />
      <Animated.Text style={[styles.pendingLabel, labelAnimStyle]} numberOfLines={1}>
        {ASSIGNMENT_LABEL}
      </Animated.Text>
    </View>
  );
}

export function RdvListCardPersonRow({
  person,
  blurred = false,
  seed,
  size = 'compact',
}: Props) {
  const styles = useThemedStyles((c) => buildStyles(c, size));

  if (person.assignmentPending) {
    return <AssignmentPendingRow size={size} />;
  }

  const name = person.name?.trim();
  if (!name) return null;
  const roleLabel = person.subtitle?.trim();

  return (
    <View style={styles.row}>
      <ProfileAvatar
        profileImageUrl={person.profileImageUrl}
        seed={seed ?? name}
        gender={person.gender}
        size={AVATAR_BY_SIZE[size]}
        blurred={blurred}
        style={styles.avatar}
      />
      <View style={styles.metaCol}>
        <Text style={styles.nameLine} numberOfLines={1} ellipsizeMode="tail">
          <Text style={styles.name}>{name}</Text>
          {roleLabel ? (
            <>
              <Text style={styles.name}>, </Text>
              <Text style={styles.roleInline}>{roleLabel}</Text>
            </>
          ) : null}
        </Text>
        {person.showRating ? (
          <CompactAssigneeRating summary={person.reviewSummary} showNewWhenEmpty />
        ) : null}
      </View>
    </View>
  );
}

function buildPendingStyles(c: AppColors, size: keyof typeof AVATAR_BY_SIZE = 'footer') {
  const isFooter = size === 'footer';
  return StyleSheet.create({
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing[2],
      minWidth: 0,
      maxWidth: '100%',
      paddingVertical: spacing[isFooter ? 1.5 : 1],
      paddingHorizontal: spacing[2.5],
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.primaryMid,
    },
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      flexShrink: 0,
    },
    pendingLabel: {
      flexShrink: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: isFooter ? fontSize.sm : fontSize.xs,
      lineHeight: lh(isFooter ? fontSize.sm : fontSize.xs),
      color: c.primaryDark,
      letterSpacing: -0.05,
    },
  });
}

function buildStyles(c: AppColors, size: keyof typeof AVATAR_BY_SIZE) {
  const isFooter = size === 'footer';
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[isFooter ? 2.5 : 2],
      minWidth: 0,
    },
    avatar: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
      flexShrink: 0,
    },
    metaCol: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    nameLine: {
      minWidth: 0,
    },
    name: {
      fontFamily: fontFamily.semiBold,
      fontSize: isFooter ? fontSize.base : fontSize.sm,
      lineHeight: lh(isFooter ? fontSize.base : fontSize.sm),
      color: c.textPrimary,
      letterSpacing: -0.1,
    },
    roleInline: {
      fontFamily: fontFamily.medium,
      fontSize: isFooter ? fontSize.sm : fontSize.xs,
      lineHeight: lh(isFooter ? fontSize.sm : fontSize.xs),
      color: c.textTertiary,
    },
  });
}
