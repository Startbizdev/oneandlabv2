import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import type { AiPromptSuggestion } from '../utils/ai-starter-suggestions';

interface Props {
  suggestions: AiPromptSuggestion[];
  onPick: (suggestion: AiPromptSuggestion) => void;
  disabled?: boolean;
}

/** Questions proposées (départ ou relance) : une ligne pleine largeur par question. */
export function CaryAiSuggestionList({ suggestions, onPick, disabled = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (suggestions.length === 0) return null;
  return (
    <View style={styles.list}>
      {suggestions.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onPick(item)}
          disabled={disabled}
          style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          <AppText variant="body" style={styles.label}>
            {item.label}
          </AppText>
          <ArrowUpRight size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      ))}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    list: { gap: spacing[2] },
    row: {
      minHeight: MIN_TOUCH_TARGET + spacing[1],
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2.5],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    pressed: { backgroundColor: c.surfaceAlt },
    disabled: { opacity: 0.45 },
    label: { flex: 1, minWidth: 0 },
  };
}
