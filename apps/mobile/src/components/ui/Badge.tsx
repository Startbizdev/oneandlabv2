import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/layout/primitives';
import Animated from 'react-native-reanimated';
import { STATUS_BADGE_COLOR, STATUS_LABELS } from '@oneandlab/shared-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'neutral' | 'teal';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  /** Pastille colorée seule — sans fond ni libellé (cartes liste). */
  dotOnly?: boolean;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'square';
}

function variantConfigFor(
  variant: BadgeVariant,
  c: ReturnType<typeof useAppColors>,
): { bg: string; text: string; dot: string } {
  switch (variant) {
    case 'primary':
      return { bg: c.primaryLight, text: c.primaryDark, dot: c.primary };
    case 'success':
      return { bg: c.successLight, text: c.success, dot: c.success };
    case 'error':
      return { bg: c.errorLight, text: c.error, dot: c.error };
    case 'warning':
      return { bg: c.warningLight, text: c.warning, dot: c.warning };
    case 'teal':
      return { bg: c.primaryLight, text: c.primaryDark, dot: c.primary };
    default:
      return { bg: c.surfaceAlt, text: c.textSecondary, dot: c.textTertiary };
  }
}

const statusToVariant: Record<string, BadgeVariant> = {
  primary: 'primary',
  success: 'success',
  error: 'error',
  warning: 'warning',
  neutral: 'neutral',
};

function BadgeComponent({
  label,
  variant = 'neutral',
  dot = true,
  dotOnly = false,
  size = 'sm',
  shape = 'rounded',
}: BadgeProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_ui_Badge_tsx_BadgeComponent_styles');

  const config = variantConfigFor(variant, c);
  const isSmall = size === 'sm';

  if (dotOnly) {
    return (
      <View
        style={[styles.dotOnlyWrap, isSmall ? styles.dotOnlyWrapSm : styles.dotOnlyWrapMd]}
        accessibilityLabel={`Statut : ${label}`}
      >
        <View
          style={[
            styles.dotOnly,
            isSmall ? styles.dotOnlySm : styles.dotOnlyMd,
            { backgroundColor: config.dot },
          ]}
        />
      </View>
    );
  }

  return (
    <Row
      align="center"
      gap={5}
      style={[
        styles.base,
        isSmall ? styles.sm : styles.md,
        shape === 'square' ? styles.square : null,
        { backgroundColor: config.bg },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: config.dot }]} />}
      <Animated.Text
        accessibilityLabel={dot ? `Statut : ${label}` : label}
        style={[
          styles.label,
          isSmall ? styles.labelSm : styles.labelMd,
          { color: config.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Row>
  );
}

export const Badge = React.memo(BadgeComponent);

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'square';
  dotOnly?: boolean;
}

function normalizeAppointmentStatusKey(status: string): string {
  const s = status.trim();
  if (s === 'in_progress') return 'inProgress';
  if (s === 'cancelled') return 'canceled';
  return s;
}

function StatusBadgeComponent({
  status,
  size = 'sm',
  shape = 'rounded',
  dotOnly = false,
}: StatusBadgeProps) {
  const normalized = normalizeAppointmentStatusKey(status);
  const colorKey = STATUS_BADGE_COLOR[normalized] ?? 'neutral';
  const label = STATUS_LABELS[normalized] ?? status;
  const variant = statusToVariant[colorKey] ?? 'neutral';
  return (
    <Badge label={label} variant={variant} dot size={size} shape={shape} dotOnly={dotOnly} />
  );
}

export const StatusBadge = React.memo(StatusBadgeComponent);

function buildStyles(c: AppColors) {
  return {
  base: {
    alignSelf: 'flex-start' as const,
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
  square: {
    borderRadius: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  dotOnlyWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dotOnlyWrapSm: {
    width: 12,
    height: 12,
  },
  dotOnlyWrapMd: {
    width: 14,
    height: 14,
  },
  dotOnly: {
    borderRadius: radius.full,
  },
  dotOnlySm: {
    width: 8,
    height: 8,
  },
  dotOnlyMd: {
    width: 10,
    height: 10,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.1,
  },
  labelSm: {
    fontSize: fontSize.xs,
  },
  labelMd: {
    fontSize: fontSize.sm,
  },
};
}
