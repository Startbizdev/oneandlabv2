import { Linking, Pressable, View } from 'react-native';
import { Info, Phone } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const EMERGENCY_NUMBERS = ['15', '112'] as const;

function callNumber(number: string) {
  Linking.openURL(`tel:${number}`).catch((e: unknown) => {
    console.warn('[cary-ai] tel link failed', e);
  });
}

/** Rappel 15 / 112 cliquable — réutilisé dans la carte et le mode vocal. */
export function CaryAiEmergencyLine({ compact = false }: { compact?: boolean }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <Row align="center" gap={spacing[2]} wrap>
      <Phone size={iconSize.xs} color={c.error} strokeWidth={2.25} />
      <AppText style={compact ? styles.emergencyCompact : styles.emergency}>Urgence :</AppText>
      {EMERGENCY_NUMBERS.map((number) => (
        <Pressable
          key={number}
          onPress={() => callNumber(number)}
          hitSlop={12}
          accessibilityRole="link"
          accessibilityLabel={`Appeler le ${number}`}
        >
          <AppText style={[compact ? styles.emergencyCompact : styles.emergency, styles.number]}>{number}</AppText>
        </Pressable>
      ))}
    </Row>
  );
}

/** Divulgation IA affichée en tête de chaque conversation (avant la première question, puis en remontant). */
export function CaryAiDisclosureCard() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Row align="center" gap={spacing[2]}>
        <Info size={iconSize.sm} color={c.primary} strokeWidth={2} />
        <AppText style={styles.title}>Assistant automatique</AppText>
      </Row>
      <AppText style={styles.body}>
        Cary répond automatiquement à partir de vos informations. Il ne remplace pas un avis médical : en cas de
        doute, contactez un professionnel de santé.
      </AppText>
      <CaryAiEmergencyLine />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      gap: spacing[2],
      padding: spacing[3],
      marginBottom: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
    },
    title: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    body: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: Math.round(fontSize.sm * 1.45),
      color: c.textSecondary,
    },
    emergency: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    emergencyCompact: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    number: {
      color: c.error,
      textDecorationLine: 'underline' as const,
    },
  };
}
