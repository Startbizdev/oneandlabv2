import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  /** Étape courante, à partir de 1. */
  current: number;
  total: number;
  label?: string;
  hint?: string;
  /** Libellés des phases : barre segmentée dont le total ne change pas selon les choix. */
  phases?: readonly string[];
}

export function BookingWizardProgress({ current, total, label, hint, phases }: Props) {
  const styles = useStyles(buildStyles);
  const count = phases?.length ?? total;
  const pct = count > 0 ? Math.min(100, Math.round((current / count) * 100)) : 0;
  const a11yText = [`Étape ${current} sur ${count}`, label, hint].filter(Boolean).join(', ');

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progression"
      accessibilityValue={{ min: 1, max: count, now: current, text: a11yText }}
    >
      <Row gap={spacing[2]} justify="between">
        <AppText style={styles.stepText}>
          Étape {current} sur {count}
        </AppText>
        {label ? <AppText style={styles.label} numberOfLines={1}>{label}</AppText> : null}
      </Row>
      {hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
      {phases ? (
        <View style={styles.phases}>
          <Row gap={spacing[1]}>
            {phases.map((phase, index) => (
              <View
                key={phase}
                style={[styles.segment, index < current && styles.segmentDone]}
              />
            ))}
          </Row>
          <Row gap={spacing[1]}>
            {phases.map((phase, index) => (
              <AppText
                key={phase}
                numberOfLines={1}
                style={[styles.phaseLabel, index === current - 1 && styles.phaseLabelCurrent]}
              >
                {phase}
              </AppText>
            ))}
          </Row>
        </View>
      ) : (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      )}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: { gap: spacing[2] },
  stepText: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.primaryDark,
  },
  label: {
    minWidth: 0,
    flex: 1,
    textAlign: 'right' as const,
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  hint: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  phases: { gap: spacing[1.5] },
  segment: {
    minWidth: 0,
    flex: 1,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: c.borderLight,
  },
  segmentDone: { backgroundColor: c.primary },
  phaseLabel: {
    minWidth: 0,
    flex: 1,
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  phaseLabelCurrent: {
    ...font.semiBold,
    color: c.textPrimary,
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
