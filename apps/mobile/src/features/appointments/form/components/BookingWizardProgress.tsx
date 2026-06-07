import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  current: number;
  total: number;
  label?: string;
  hint?: string;
}

export function BookingWizardProgress({ current, total, label, hint }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.stepText}>
          Étape {current} sur {total}
        </Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  label: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  track: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: c.borderLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: radius.full,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_BookingWizardProgress_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
