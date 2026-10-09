import type { AiEmergency } from '@oneandlab/shared-types';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { EMERGENCY_ACTIONS, emergencyTelUrl } from '../utils/ai-emergency';

const NUMBER_PILL_HEIGHT = spacing[8];

function callEmergencyNumber(phone: string) {
  const url = emergencyTelUrl(phone);
  if (!url) return;
  Linking.openURL(url).catch((e: unknown) => {
    console.warn('[cary-ai] appel impossible', phone, e);
  });
}

/**
 * Rappel permanent et discret en haut de l'écran Cary : 15, 112, 3114 en un geste.
 * `inline` : sans fond ni filet, dans un en-tête existant (mode vocal).
 */
export function CaryAiEmergencyBanner({ variant = 'bar' }: { variant?: 'bar' | 'inline' }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.bannerRow, variant === 'bar' && styles.banner]} accessibilityRole="summary">
      <Phone size={iconSize.sm} color={c.error} strokeWidth={ICON_STROKE_WIDTH} />
      <AppText variant="caption" style={styles.bannerLabel}>
        Urgence
      </AppText>
      <Row gap={spacing[2]} style={styles.numbers}>
        {EMERGENCY_ACTIONS.map((action) => (
          <Pressable
            key={action.phone}
            onPress={() => callEmergencyNumber(action.phone)}
            hitSlop={(MIN_TOUCH_TARGET - NUMBER_PILL_HEIGHT) / 2}
            style={({ pressed }) => [styles.numberPill, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <AppText variant="caption" style={styles.number}>
              {action.phone}
            </AppText>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

/** Réponse d'urgence du serveur : consigne fixe et boutons d'appel, à la place d'une réponse du modèle. */
export function CaryAiEmergencyCard({ emergency }: { emergency: AiEmergency }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.card} accessibilityRole="alert">
      <AppText variant="headline" style={styles.cardTitle}>
        {emergency.title}
      </AppText>
      {emergency.body ? <AppText variant="body">{emergency.body}</AppText> : null}
      <View style={styles.cardActions}>
        {emergency.actions.map((action, index) => (
          <Button
            key={`${action.phone}-${index}`}
            title={action.label}
            variant={index === 0 ? 'destructive' : 'dangerOutline'}
            onPress={() => callEmergencyNumber(action.phone)}
            fullWidth
            leftIcon={<EmergencyPhoneIcon solid={index === 0} />}
          />
        ))}
      </View>
    </View>
  );
}

function EmergencyPhoneIcon({ solid }: { solid: boolean }) {
  const c = useAppColors();
  return <Phone size={iconSize.md} color={solid ? c.onPrimary : c.error} strokeWidth={ICON_STROKE_WIDTH} />;
}

function buildStyles({ colors: c }: Theme) {
  return {
    bannerRow: {
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },
    banner: {
      paddingHorizontal: spacing[4],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
      backgroundColor: c.background,
    },
    bannerLabel: { ...font.medium, color: c.error },
    numbers: { marginLeft: 'auto' as const },
    numberPill: {
      minWidth: spacing[12],
      minHeight: NUMBER_PILL_HEIGHT,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.errorLight,
    },
    pressed: { opacity: 0.6 },
    number: { ...font.semiBold, color: c.error },
    card: {
      minWidth: 0,
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.errorMid,
      backgroundColor: c.errorLight,
    },
    cardTitle: { color: c.error },
    cardActions: { gap: spacing[2] },
  };
}
