import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  current: number;
  total: number;
  label?: string;
  hint?: string;
}

export function BookingWizardProgress({ current, total, label, hint }: Props) {
  const styles = useStyles(buildStyles);
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <View style={styles.wrap}>
      <Row gap={spacing[2]} justify="between">
        <AppText style={styles.stepText}>
          Étape {current} sur {total}
        </AppText>
        {label ? <AppText style={styles.label}>{label}</AppText> : null}
      </Row>
      {hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: { gap: spacing[2] },
  stepText: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.35,
  },
  label: {
    minWidth: 0,
    flex: 1,
    textAlign: 'right' as const,
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  hint: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  track: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  fill: {
    height: '100%' as const,
    backgroundColor: c.primary,
    borderRadius: radius.full,
  },
};
}

