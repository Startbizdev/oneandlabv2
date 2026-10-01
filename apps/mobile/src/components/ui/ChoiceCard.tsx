import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { ListRowShell } from '@/components/ui/ListRowShell';
import {
  AppText,
  ICON_STROKE_WIDTH,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

export interface ChoiceCardProps {
  title: string;
  description?: string;
  /** Mention courte au-dessus du titre (ex. « Le plus courant »). */
  eyebrow?: string;
  leading?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Choix exclusif dans un `radiogroup` : carte bordée, pastille radio à droite. */
export function ChoiceCard({
  title,
  description,
  eyebrow,
  leading,
  selected,
  disabled = false,
  onPress,
}: ChoiceCardProps) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
    >
      <ListRowShell
        style={styles.row}
        leading={leading}
        body={
          <View style={styles.texts}>
            {eyebrow ? (
              <AppText variant="caption" style={styles.eyebrow}>
                {eyebrow}
              </AppText>
            ) : null}
            <AppText variant="headline">{title}</AppText>
            {description ? <AppText variant="secondary">{description}</AppText> : null}
          </View>
        }
        trailing={
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? (
              <Check size={iconSize.xs} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            ) : null}
          </View>
        }
      />
    </Pressable>
  );
}

const RADIO = 24;

function buildStyles({ colors: c }: Theme) {
  return {
    card: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    cardSelected: { borderColor: c.primary },
    cardPressed: { backgroundColor: c.surfaceAlt },
    cardDisabled: { opacity: 0.5 },
    row: { minHeight: 56 },
    texts: { gap: spacing[0.5] },
    eyebrow: { color: c.textSecondary },
    radio: {
      width: RADIO,
      height: RADIO,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    radioSelected: { borderColor: c.primary, backgroundColor: c.primary },
  };
}
