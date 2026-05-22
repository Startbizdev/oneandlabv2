import { StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
}

/** Alertes proche uniquement (bénéficiaire + titulaire sont dans « Informations du rendez-vous »). */
export function StaffPatientKvSection({ apt }: Props) {
  const ext = apt as Appointment & {
    relative?: { is_minor?: boolean; age_years?: number };
  };

  if (!ext.relative?.is_minor) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.minor}>
        <Text style={styles.minorText}>
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
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  minorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: '#92400E',
    lineHeight: fontSize.xs * 1.45,
  },
});
