import React from 'react';
import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { STATUS_BADGE_COLOR, STATUS_LABELS } from '@oneandlab/shared-utils';
import { radius, spacing, useStyles, font, AppText, type AppColors, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
}

function variantConfigFor(variant: BadgeVariant, c: AppColors): { bg: string; text: string; dot: string } {
  switch (variant) {
    case 'primary':
      return { bg: c.primaryLight, text: c.primaryDark, dot: c.primary };
    case 'success':
      return { bg: c.successLight, text: c.success, dot: c.success };
    case 'error':
      return { bg: c.errorLight, text: c.error, dot: c.error };
    case 'warning':
      return { bg: c.warningLight, text: c.warning, dot: c.warning };
    case 'neutral':
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

function BadgeComponent({ label, variant = 'neutral', dot = true, size = 'sm' }: BadgeProps) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const config = variantConfigFor(variant, c);
  const isSmall = size === 'sm';

  return (
    <Row
      align="center"
      gap={spacing[1.5]}
      style={[styles.base, isSmall ? styles.sm : styles.md, { backgroundColor: config.bg }]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: config.dot }]} />}
      <AppText
        accessibilityLabel={dot ? `Statut : ${label}` : label}
        style={[styles.label, isSmall ? styles.labelSm : styles.labelMd, { color: config.text }]}
      >
        {label}
      </AppText>
    </Row>
  );
}

export const Badge = React.memo(BadgeComponent);

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

function normalizeAppointmentStatusKey(status: string): string {
  const s = status.trim();
  if (s === 'in_progress') return 'inProgress';
  if (s === 'cancelled') return 'canceled';
  return s;
}

function StatusBadgeComponent({ status, size = 'sm' }: StatusBadgeProps) {
  const normalized = normalizeAppointmentStatusKey(status);
  const colorKey = STATUS_BADGE_COLOR[normalized] ?? 'neutral';
  const label = STATUS_LABELS[normalized] ?? status;
  const variant = statusToVariant[colorKey] ?? 'neutral';
  return <Badge label={label} variant={variant} dot size={size} />;
}

export const StatusBadge = React.memo(StatusBadgeComponent);

function buildStyles({ fontSize }: Theme) {
  return {
    base: {
      alignSelf: 'flex-start' as const,
      maxWidth: '100%' as const,
    },
    sm: {
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
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
      ...font.semiBold,
      flexShrink: 1,
    },
    labelSm: {
      fontSize: fontSize.xs,
    },
    labelMd: {
      fontSize: fontSize.sm,
    },
  };
}
