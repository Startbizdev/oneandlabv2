import { StyleSheet, Text, View } from 'react-native';
import { UserCheck } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patient: PatientRow | null;
  /** Variante prise de RDV vs création dossier patient. */
  variant?: 'booking' | 'create';
  onDismiss: () => void;
  onUseExisting: () => void;
}

export function PatientDuplicatePrompt({
  patient,
  variant = 'booking',
  onDismiss,
  onUseExisting,
}: Props) {
  if (!patient) return null;

  const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
  const isBooking = variant === 'booking';

  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.header}>
        <UserCheck size={22} color={colors.primary} strokeWidth={2} />
        <Text style={styles.title}>Patient déjà enregistré</Text>
      </View>
      <Text style={styles.text}>
        {isBooking
          ? `Un dossier existe déjà${name ? ` pour ${name}` : ''}. Vous pouvez le sélectionner pour ce rendez-vous ou continuer à saisir un nouveau patient.`
          : `Un dossier existe déjà${name ? ` (${name})` : ''}. Utilisez-le ou continuez la création si c’est bien une autre personne.`}
      </Text>
      <View style={styles.actions}>
        <Button
          title={isBooking ? 'Continuer en nouveau' : 'Continuer la saisie'}
          variant="outline"
          size="sm"
          onPress={onDismiss}
          fullWidth
        />
        <Button
          title={isBooking ? 'Utiliser ce patient' : 'Utiliser ce dossier'}
          size="sm"
          onPress={onUseExisting}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2.5],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primaryDark,
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  actions: {
    gap: spacing[2],
    marginTop: spacing[0.5],
  },
});
