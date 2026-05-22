import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { STATUS_BADGE_COLOR, STATUS_LABELS } from '@oneandlab/shared-utils';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'neutral' | 'teal';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  primary: { bg: colors.primaryLight, text: colors.primaryDark, dot: colors.primary },
  success: { bg: colors.successLight, text: colors.success, dot: colors.success },
  error: { bg: colors.errorLight, text: colors.error, dot: colors.error },
  warning: { bg: colors.warningLight, text: colors.warning, dot: colors.warning },
  neutral: { bg: colors.surfaceAlt, text: colors.textSecondary, dot: colors.textTertiary },
  teal: { bg: '#F0FDFA', text: '#0F766E', dot: '#0D9488' },
};

const statusToVariant: Record<string, BadgeVariant> = {
  primary: 'primary',
  success: 'success',
  error: 'error',
  warning: 'warning',
  neutral: 'neutral',
};

function BadgeComponent({ label, variant = 'neutral', dot = true, size = 'sm' }: BadgeProps) {
  const config = variantConfig[variant];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.base, isSmall ? styles.sm : styles.md, { backgroundColor: config.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: config.dot }]} />}
      <Animated.Text
        style={[
          styles.label,
          isSmall ? styles.labelSm : styles.labelMd,
          { color: config.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

export const Badge = React.memo(BadgeComponent);

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

function StatusBadgeComponent({ status, size = 'sm' }: StatusBadgeProps) {
  const colorKey = STATUS_BADGE_COLOR[status] ?? 'neutral';
  const label = STATUS_LABELS[status] ?? status;
  const variant = statusToVariant[colorKey] ?? 'neutral';
  return <Badge label={label} variant={variant} dot size={size} />;
}

export const StatusBadge = React.memo(StatusBadgeComponent);

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  sm: {
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  md: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.1,
  },
  labelSm: {
    fontSize: fontSize['2xs'],
  },
  labelMd: {
    fontSize: fontSize.xs,
  },
});
