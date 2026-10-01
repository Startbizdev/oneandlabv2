import { useAppColors } from '@/theme/use-app-colors';

import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { UserCheck } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import type { PatientLookupMatch } from '@oneandlab/shared-api';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  patient: PatientLookupMatch | null;
  /** Variante prise de RDV vs création dossier patient. */
  variant?: 'booking' | 'create';
  /** Adoption du dossier en cours (`POST /patients/adopt`). */
  adopting?: boolean;
  onDismiss: () => void;
  onUseExisting: () => void;
}

export function PatientDuplicatePrompt({
  patient,
  variant = 'booking',
  adopting = false,
  onDismiss,
  onUseExisting,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (!patient) return null;

  const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
  const isBooking = variant === 'booking';

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Row gap={spacing[2]} align="center">
        <UserCheck size={iconSize.lg} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
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
          disabled={adopting}
          fullWidth
        />
        <Button
          title={isBooking ? 'Utiliser ce patient' : 'Utiliser ce dossier'}
          size="sm"
          onPress={onUseExisting}
          loading={adopting}
          fullWidth
        />
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.primaryDark,
  },
  text: {
    ...font.regular,
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

