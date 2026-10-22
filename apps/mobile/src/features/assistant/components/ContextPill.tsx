import { Pressable, StyleSheet, View } from 'react-native';
import { X, type LucideIcon } from 'lucide-react-native';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

/** Pastille visuelle de 36 pt ; la zone tactile atteint 44 pt avec `hitSlop`. */
const PILL_HEIGHT = spacing[9];
const SLOP = (MIN_TOUCH_TARGET - PILL_HEIGHT) / 2;

interface Props {
  icon: LucideIcon;
  label: string;
  /** Ouvre l'objet (rendez-vous) ou change de patient (soignant). */
  onPress?: () => void;
  pressHint?: string;
  onClear: () => void;
  clearLabel: string;
}

/** Sujet de la conversation (rendez-vous, résultat, patient) ; la croix le retire. */
export function ContextPill({ icon: Icon, label, onPress, pressHint, onClear, clearLabel }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.pill}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={{ top: SLOP, bottom: SLOP }}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={label}
        accessibilityHint={onPress ? pressHint : undefined}
      >
        <Icon size={iconSize.sm} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onClear}
        hitSlop={SLOP}
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
      >
        <X size={iconSize.sm} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>
    </View>
  );
}

/** Action secondaire de la barre de sujet (choisir un patient, compte rendu) : même gabarit, ton neutre. */
export function ScopeActionPill({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: SLOP, bottom: SLOP }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={iconSize.sm} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />
      <AppText variant="caption" style={styles.actionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    pill: {
      flexShrink: 1,
      minWidth: 0,
      minHeight: PILL_HEIGHT,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
    },
    main: {
      flexShrink: 1,
      minWidth: 0,
      minHeight: PILL_HEIGHT,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      paddingLeft: spacing[3],
      paddingVertical: spacing[1],
    },
    label: { ...font.medium, color: c.primaryDark, flexShrink: 1 },
    clear: {
      width: PILL_HEIGHT,
      height: PILL_HEIGHT,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    action: {
      minHeight: PILL_HEIGHT,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      paddingHorizontal: spacing[3],
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    actionLabel: { ...font.medium, color: c.textPrimary },
    pressed: { opacity: 0.6 },
  };
}
