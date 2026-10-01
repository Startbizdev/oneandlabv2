import { StyleSheet, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { ICON_STROKE_WIDTH, iconSize, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  apt: Appointment;
}

/** Alerte « personne mineure » (bénéficiaire et titulaire sont dans les informations du rendez-vous). */
export function StaffPatientKvSection({ apt }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const ext = apt as Appointment & {
    relative?: { is_minor?: boolean; age_years?: number };
  };

  if (!ext.relative?.is_minor) return null;

  const age = ext.relative.age_years;
  const ageLabel = age != null ? ` (${age} an${age === 1 ? '' : 's'})` : '';

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <TriangleAlert size={iconSize.md} color={c.warning} strokeWidth={ICON_STROKE_WIDTH} />
      <View style={styles.texts}>
        <AppText style={styles.title}>Personne mineure{ageLabel}</AppText>
        <AppText variant="caption">Rendez-vous pris par le titulaire du compte.</AppText>
      </View>
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    wrap: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing[3],
      borderRadius: radius.lg,
      padding: spacing[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.warningMid,
      backgroundColor: c.warningLight,
    },
    texts: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    title: {
      ...text.body,
      ...font.semiBold,
      color: c.textPrimary,
    },
  };
}
