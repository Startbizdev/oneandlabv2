import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing } from '@/theme';
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
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_PreferredNurseGenderButtons_tsx_styles');
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Préférence pour l&apos;infirmier(ère)</Text>
      <Row wrap gap={spacing[2]}>
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
      </Row>
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

