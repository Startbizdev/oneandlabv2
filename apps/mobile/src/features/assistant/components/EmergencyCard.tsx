import type { AssistantAction } from '@oneandlab/shared-types';
import { Linking, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { AppText, ICON_STROKE_WIDTH, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { emergencyTelUrl } from '../utils/assistant-actions';

/** Numéros des actions `call_emergency` (15 et 112, ou 3114 et 15), sinon celui de l'événement. */
export function emergencyNumbers(actions: AssistantAction[], fallback?: string): string[] {
  const numbers = actions.filter((a) => a.type === 'call_emergency').map((a) => emergencyTelUrl(a.params.number).slice(4));
  const unique = [...new Set(numbers)];
  return unique.length > 0 ? unique : [emergencyTelUrl(fallback).slice(4)];
}

/** Réponse d'urgence fixe du serveur (aucun appel au modèle) : consigne et appel en un geste. */
export function EmergencyCard({ message, numbers }: { message: string; numbers: string[] }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.card} accessibilityRole="alert">
      <AppText variant="headline" style={styles.title}>
        Urgence
      </AppText>
      {message ? <AppText variant="body">{message}</AppText> : null}
      {numbers.map((number, index) => (
        <Button
          key={number}
          title={`Appeler le ${number}`}
          variant={index === 0 ? 'destructive' : 'dangerOutline'}
          fullWidth
          leftIcon={
            <Phone size={iconSize.md} color={index === 0 ? c.textInverse : c.error} strokeWidth={ICON_STROKE_WIDTH} />
          }
          onPress={() => {
            Linking.openURL(`tel:${number}`).catch((e: unknown) => console.warn('[assistant] appel impossible', e));
          }}
        />
      ))}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    card: {
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.errorMid,
      backgroundColor: c.errorLight,
    },
    title: { color: c.error },
  };
}
