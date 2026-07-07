import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Cluster, Row } from '@/components/layout/primitives';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { CompactAssigneeRating } from '@/features/appointments/detail/components/CompactAssigneeRating';
import type { RdvMaquetteCounterparty } from '@/utils/rdv-maquette-card-display';
import { radius, spacing, AppText } from '@/theme';
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
  const styles = useThemedStyles(buildPendingDotsStyles, 'RdvListCardPersonRow.dots');

  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Row gap={spacing[1]} align="center">
        {[0, 1, 2].map((index) => (
          <AssignmentDot key={index} index={index} color={c.primary} />
        ))}
      </Row>
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
  const styles = useThemedStyles(
    size === 'footer' ? buildPendingStylesFooter : buildPendingStylesCompact,
    'RdvListCardPersonRow.pending',
  );
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
    <View accessibilityRole="text" accessibilityLabel={ASSIGNMENT_LABEL}>
      <Row gap={spacing[2]} align="center" style={styles.pendingRow}>
        <AssignmentPulseDots />
        <Animated.Text style={[styles.pendingLabel, labelAnimStyle]} numberOfLines={1}>
          {ASSIGNMENT_LABEL}
        </Animated.Text>
      </Row>
    </View>
  );
}

export function RdvListCardPersonRow({
  person,
  blurred = false,
  seed,
  size = 'compact',
}: Props) {
  const styles = useThemedStyles(
    size === 'footer' ? buildPersonStylesFooter : buildPersonStylesCompact,
    'RdvListCardPersonRow',
  );

  if (person.assignmentPending) {
    return <AssignmentPendingRow size={size} />;
  }

  const name = person.name?.trim();
  if (!name) return null;
  const roleLabel = person.subtitle?.trim();

  return (
    <Cluster
      gap={spacing[size === 'footer' ? 2.5 : 2]}
      leading={
        <ProfileAvatar
          profileImageUrl={person.profileImageUrl}
          seed={seed ?? name}
          gender={person.gender}
          size={AVATAR_BY_SIZE[size]}
          blurred={blurred}
          style={styles.avatar}
        />
      }
    >
      <View style={styles.metaCol}>
        <AppText style={styles.nameLine} numberOfLines={1} ellipsizeMode="tail">
          <AppText style={styles.name}>{name}</AppText>
          {roleLabel ? (
            <>
              <AppText style={styles.name}>, </AppText>
              <AppText style={styles.roleInline}>{roleLabel}</AppText>
            </>
          ) : null}
        </AppText>
        {person.showRating ? (
          <CompactAssigneeRating summary={person.reviewSummary} showNewWhenEmpty />
        ) : null}
      </View>
    </Cluster>
  );
}

function buildPendingDotsStyles(_c: AppColors) {
  return {
    dots: {
      flexShrink: 0,
    },
  };
}

function buildPendingStylesCompact(c: AppColors) {
  return buildPendingStyles(c, 'compact');
}

function buildPendingStylesFooter(c: AppColors) {
  return buildPendingStyles(c, 'footer');
}

function buildPendingStyles(c: AppColors, size: keyof typeof AVATAR_BY_SIZE) {
  const isFooter = size === 'footer';
  return {
    pendingRow: {
      alignSelf: 'flex-start' as const,
      maxWidth: '100%' as const,
      paddingVertical: spacing[isFooter ? 1.5 : 1],
      paddingHorizontal: spacing[2.5],
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.primaryMid,
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
  };
}

function buildPersonStylesCompact(c: AppColors) {
  return buildPersonStyles(c, 'compact');
}

function buildPersonStylesFooter(c: AppColors) {
  return buildPersonStyles(c, 'footer');
}

function buildPersonStyles(c: AppColors, size: keyof typeof AVATAR_BY_SIZE) {
  const isFooter = size === 'footer';
  return {
    avatar: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
    },
    metaCol: {
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
  };
}
