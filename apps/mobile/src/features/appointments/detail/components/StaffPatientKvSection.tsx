import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  apt: Appointment;
}

/** Alertes proche uniquement (bénéficiaire + titulaire sont dans « Informations du rendez-vous »). */
export function StaffPatientKvSection({ apt }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: { gap: spacing[3] },
  minor: {
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
  },
  minorText: {
    ...font.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.45,
  },
};
}
