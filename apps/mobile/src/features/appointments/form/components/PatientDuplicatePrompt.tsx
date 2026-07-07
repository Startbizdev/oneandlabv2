import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { UserCheck } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_PatientDuplicatePrompt_tsx_styles');
  if (!patient) return null;

  const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
  const isBooking = variant === 'booking';

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Row gap={spacing[2]} align="center">
        <UserCheck size={iconSize.mdLg} color={c.primary} strokeWidth={2} />
        <AppText style={styles.title}>Patient déjà enregistré</AppText>
      </Row>
      <AppText style={styles.text}>
        {isBooking
          ? `Un dossier existe déjà${name ? ` pour ${name}` : ''}. Vous pouvez le sélectionner pour ce rendez-vous ou continuer à saisir un nouveau patient.`
          : `Un dossier existe déjà${name ? ` (${name})` : ''}. Utilisez-le ou continuez la création si c’est bien une autre personne.`}
      </AppText>
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

function buildStyles(c: AppColors) {
  return {
  card: {
    gap: spacing[2.5],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  title: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primaryDark,
  },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  actions: {
    gap: spacing[2],
    marginTop: spacing[0.5],
  },
};
}

