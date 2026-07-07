import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { radius, spacing, AppText } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
}

/** Alertes proche uniquement (bénéficiaire + titulaire sont dans « Informations du rendez-vous »). */
export function StaffPatientKvSection({ apt }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_StaffPatientKvSection_tsx_StaffPatientKvSection_styles');

  const ext = apt as Appointment & {
    relative?: { is_minor?: boolean; age_years?: number };
  };

  if (!ext.relative?.is_minor) return null;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.minor,
          { backgroundColor: c.warningLight, borderColor: c.warningMid },
        ]}
      >
        <AppText style={[styles.minorText, { color: c.warning }]}>
          Personne mineure
          {ext.relative.age_years != null
            ? ` (${ext.relative.age_years} an${ext.relative.age_years === 1 ? '' : 's'})`
            : ''}
          {' · '}
          le rendez-vous est réservé par le titulaire du compte (voir « Rendez-vous pris par »).
        </AppText>
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[3] },
  minor: {
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
  },
  minorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.45,
  },
};
}
