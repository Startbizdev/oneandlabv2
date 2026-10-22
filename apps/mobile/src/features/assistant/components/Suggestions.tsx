import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { AppText, H_PADDING, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import type { StarterSuggestion } from '../utils/assistant-suggestions';

type Props = { firstName?: string; suggestions: StarterSuggestion[]; onPick: (message: string) => void };

/** Nouvelle conversation : salutation centrée et questions de départ ; toucher une question l'envoie. */
export const Suggestions = memo(function Suggestions({ firstName, suggestions, onPick }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Sparkles size={iconSize.lg} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <AppText variant="title" style={styles.center} accessibilityRole="header">
        {firstName ? `Bonjour ${firstName}, comment puis-je vous aider ?` : 'Bonjour, comment puis-je vous aider ?'}
      </AppText>
      <View style={styles.pills}>
        {suggestions.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => onPick(s.message)}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityHint="Envoie cette question à Cary"
          >
            <AppText variant="secondary" style={styles.pillText}>
              {s.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

function buildStyles({ colors: c }: Theme) {
  return {
    root: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      paddingHorizontal: H_PADDING,
      paddingVertical: spacing[6],
    },
    badge: {
      width: spacing[12],
      height: spacing[12],
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primaryLight,
    },
    center: { textAlign: 'center' as const },
    pills: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],
      marginTop: spacing[3],
    },
    pill: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillText: { ...font.medium, color: c.textPrimary },
    pressed: { backgroundColor: c.surfaceAlt },
  };
}
