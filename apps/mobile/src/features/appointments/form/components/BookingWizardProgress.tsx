import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  /** Étape courante, à partir de 1. */
  current: number;
  total: number;
  label?: string;
  hint?: string;
  /** Libellés des étapes affichées : un segment par étape. */
  phases?: readonly string[];
}

export function BookingWizardProgress({ current, total, label, hint, phases }: Props) {
  const styles = useStyles(buildStyles);
  const count = phases?.length ?? total;
  const stepText = [`Étape ${current} sur ${count}`, label].filter(Boolean).join(' · ');
  const a11yText = [stepText, hint].filter(Boolean).join(', ');

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progression"
      accessibilityValue={{ min: 1, max: count, now: current, text: a11yText }}
    >
      <Row gap={spacing[1]}>
        {[...Array(count).keys()].map((index) => (
          <View
            key={phases?.[index] ?? index}
            style={[styles.segment, index < current && styles.segmentDone]}
          />
        ))}
      </Row>
      <AppText variant="caption" style={styles.stepText}>
        {stepText}
      </AppText>
      {hint ? <AppText variant="secondary">{hint}</AppText> : null}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: { gap: spacing[2] },
    stepText: {
      ...font.semiBold,
      color: c.textSecondary,
    },
    segment: {
      minWidth: 0,
      flex: 1,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: c.borderLight,
    },
    segmentDone: { backgroundColor: c.primary },
  };
}
