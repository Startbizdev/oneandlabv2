import { StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { radius, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
}

/** Alertes proche uniquement (bénéficiaire + titulaire sont dans « Informations du rendez-vous »). */
export function StaffPatientKvSection({ apt }: Props) {
  const c = useAppColors();
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
        <Text style={[styles.minorText, { color: c.warning }]}>
          Personne mineure
          {ext.relative.age_years != null
            ? ` (${ext.relative.age_years} an${ext.relative.age_years === 1 ? '' : 's'})`
            : ''}
          {' · '}
          le rendez-vous est réservé par le titulaire du compte (voir « Rendez-vous pris par »).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
