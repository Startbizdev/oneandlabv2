import { Linking, Text } from 'react-native';
import { AppText, useStyles, font, type Theme } from '@/theme';

const EMERGENCY_NUMBERS = ['15', '112'] as const;

function callNumber(number: string) {
  Linking.openURL(`tel:${number}`).catch((e: unknown) => {
    console.warn('[cary-ai] tel link failed', e);
  });
}

/** Divulgation IA, suivie du rappel d'urgence sur la même ligne. */
export const CARY_AI_NOTICE = 'IA, pas un avis médical';

/** Rappel 15 / 112 cliquable en une phrase — compositeur et mode vocal. */
export function CaryAiEmergencyLine({ lead, centered = false }: { lead?: string; centered?: boolean }) {
  const styles = useStyles(buildStyles);
  return (
    <AppText variant="caption" style={centered ? styles.centered : undefined}>
      {lead ? `${lead} · ` : ''}Urgence{' '}
      {EMERGENCY_NUMBERS.map((number, index) => (
        <Text
          key={number}
          onPress={() => callNumber(number)}
          accessibilityRole="link"
          accessibilityLabel={`Appeler le ${number}`}
          style={styles.number}
        >
          {index > 0 ? ` · ${number}` : number}
        </Text>
      ))}
    </AppText>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    centered: { textAlign: 'center' as const },
    number: { ...font.semiBold, color: c.error },
  };
}
