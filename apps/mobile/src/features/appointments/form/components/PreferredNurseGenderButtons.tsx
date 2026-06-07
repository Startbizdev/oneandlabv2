import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const OPTIONS = [
  { label: 'Sans préférence', value: 'any' },
  { label: 'Femme', value: 'female' },
  { label: 'Homme', value: 'male' },
] as const;

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function PreferredNurseGenderButtons({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Préférence pour l&apos;infirmier(ère)</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const on = (value || 'any') === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.pill, on && styles.pillActive]}
            >
              <Text style={[styles.text, on && styles.textActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  pillActive: { backgroundColor: c.primary, borderColor: c.primary },
  text: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: c.textSecondary },
  textActive: { color: c.textInverse },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_PreferredNurseGenderButtons_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
