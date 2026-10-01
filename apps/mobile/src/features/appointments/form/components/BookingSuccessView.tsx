import { Image, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { AppText, radius, spacing, useStyles, type Theme } from '@/theme';

type Action = { label: string; onPress: () => void };

interface Props {
  appointmentCount: number;
  warning?: string;
  requiresFasting: boolean;
  primaryAction: Action;
  secondaryAction?: Action;
}

/**
 * Suite d'une demande patient (statut « en attente ») : confirmation par un professionnel,
 * puis notification + e-mail envoyés par le backend (`NotificationService::notifyAppointmentConfirmed`).
 */
export function BookingSuccessView({
  appointmentCount,
  warning,
  requiresFasting,
  primaryAction,
  secondaryAction,
}: Props) {
  const styles = useStyles(buildStyles);
  const plural = appointmentCount > 1;

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image
          source={ILLUSTRATIONS.success}
          style={styles.illustration}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <AppText variant="title" style={styles.center} accessibilityRole="header">
          {plural ? `${appointmentCount} demandes envoyées` : 'Demande envoyée'}
        </AppText>
        <AppText variant="secondary" style={styles.center}>
          {`Un professionnel de votre secteur va ${plural ? 'les' : 'la'} confirmer. Vous serez prévenu par notification et e-mail.`}
        </AppText>
      </View>

      {warning ? (
        <View style={styles.warning} accessibilityRole="alert">
          <AppText variant="body">{warning}</AppText>
        </View>
      ) : null}

      <View style={styles.reminder}>
        <AppText variant="headline">Le jour de la visite</AppText>
        <AppText variant="secondary">
          {requiresFasting
            ? 'Venez à jeun et gardez votre ordonnance et votre carte Vitale à portée de main.'
            : 'Gardez votre ordonnance et votre carte Vitale à portée de main.'}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button title={primaryAction.label} size="lg" fullWidth onPress={primaryAction.onPress} />
        {secondaryAction ? (
          <Button
            title={secondaryAction.label}
            variant="ghost"
            size="lg"
            fullWidth
            onPress={secondaryAction.onPress}
          />
        ) : null}
      </View>
    </View>
  );
}

const ILLUSTRATION_SIZE = 160;

function buildStyles({ colors: c }: Theme) {
  return {
    root: { gap: spacing[6] },
    hero: { alignItems: 'center' as const, gap: spacing[2], paddingTop: spacing[4] },
    illustration: { width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE, marginBottom: spacing[2] },
    center: { textAlign: 'center' as const },
    warning: {
      padding: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.warningLight,
    },
    reminder: {
      gap: spacing[1],
      padding: spacing[4],
      borderRadius: radius.lg,
      backgroundColor: c.surfaceAlt,
    },
    actions: { gap: spacing[2] },
  };
}
