import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { GENDER_OPTIONS } from '@/constants/pro-emploi';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function GenderSelect({ label = 'Genre', value, onChange, error }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_auth_components_GenderSelect_tsx_styles');
  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>
      <Row wrap gap={spacing[2]}>
        {GENDER_OPTIONS.map((g) => {
          const active = value === g.value;
          return (
            <Pressable
              key={g.value}
              onPress={() => onChange(g.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <AppText style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</AppText>
            </Pressable>
          );
        })}
      </Row>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.3,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
  },
  chipActive: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  chipTextActive: {
    color: c.primary,
    fontFamily: fontFamily.semiBold,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.error,
  },
};
}

