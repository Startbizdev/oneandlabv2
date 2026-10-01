import { View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, font, radius, spacing, useStyles, type Theme } from '@/theme';

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
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const plural = appointmentCount > 1;
  const steps = [
    {
      title: 'Un professionnel confirme',
      text: plural
        ? 'Un professionnel de santé de votre secteur examine chacune de vos demandes.'
        : 'Un professionnel de santé de votre secteur examine votre demande.',
    },
    {
      title: 'Vous êtes prévenu',
      text: 'Vous recevez une notification et un e-mail dès que le rendez-vous est confirmé.',
    },
    {
      title: 'Le jour du rendez-vous',
      text: requiresFasting
        ? 'Le prélèvement est à jeun : suivez les consignes de votre ordonnance. Gardez votre ordonnance et votre carte Vitale à portée de main.'
        : 'Gardez votre ordonnance et votre carte Vitale à portée de main.',
    },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.iconCircle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <CircleCheck size={40} color={c.primaryDark} strokeWidth={2} />
        </View>
        <AppText style={styles.title} accessibilityRole="header">
          {plural ? 'Demandes envoyées' : 'Demande envoyée'}
        </AppText>
        <AppText style={styles.subtitle}>
          {plural
            ? `Vos ${appointmentCount} demandes de rendez-vous sont enregistrées.`
            : 'Votre demande de rendez-vous est enregistrée.'}
        </AppText>
      </View>

      {warning ? (
        <View style={styles.warning} accessibilityRole="alert">
          <AppText style={styles.warningText}>{warning}</AppText>
        </View>
      ) : null}

      <View style={styles.next}>
        <AppText style={styles.nextTitle} accessibilityRole="header">Et maintenant ?</AppText>
        {steps.map((s, index) => (
          <Row key={s.title} align="start" gap={spacing[3]}>
            <View style={styles.stepBadge}>
              <AppText style={styles.stepNum}>{index + 1}</AppText>
            </View>
            <View style={styles.stepCopy}>
              <AppText style={styles.stepTitle}>{s.title}</AppText>
              <AppText style={styles.stepText}>{s.text}</AppText>
            </View>
          </Row>
        ))}
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

const ICON_CIRCLE = 80;
const STEP_BADGE = 32;

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: { gap: spacing[6] },
    hero: { alignItems: 'center' as const, gap: spacing[2], paddingTop: spacing[4] },
    iconCircle: {
      width: ICON_CIRCLE,
      height: ICON_CIRCLE,
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing[2],
    },
    title: {
      ...font.headingExtraBold,
      fontSize: fontSize['2xl'],
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    subtitle: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.45,
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
    warning: {
      padding: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.warningLight,
      borderWidth: 1,
      borderColor: c.warningMid,
    },
    warningText: {
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textPrimary,
    },
    next: {
      gap: spacing[4],
      padding: spacing[4],
      borderRadius: radius.xl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    nextTitle: {
      ...font.headingSemiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    stepBadge: {
      width: STEP_BADGE,
      height: STEP_BADGE,
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    stepNum: {
      ...font.bold,
      fontSize: fontSize.sm,
      color: c.primaryDark,
    },
    stepCopy: { minWidth: 0, flex: 1, gap: 2 },
    stepTitle: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    stepText: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textSecondary,
    },
    actions: { gap: spacing[2] },
  };
}
