import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GENDER_OPTIONS } from '@/constants/pro-emploi';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function GenderSelect({ label = 'Genre', value, onChange, error }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {GENDER_OPTIONS.map((g) => {
          const active = value === g.value;
          return (
            <Pressable
              key={g.value}
              onPress={() => onChange(g.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.error,
  },
});
