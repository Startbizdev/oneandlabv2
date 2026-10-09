import { Pressable, StyleSheet, View } from 'react-native';
import { X, type LucideIcon } from 'lucide-react-native';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  icon: LucideIcon;
  label: string;
  /** Ouvre l'objet (rendez-vous) ou change de patient (soignant). */
  onPress?: () => void;
  pressHint?: string;
  onClear: () => void;
}

/** Objet de la conversation (rendez-vous, résultat, patient) ; la croix revient à la conversation générale. */
export function CaryAiContextPill({ icon: Icon, label, onPress, pressHint, onClear }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.pill}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`Conversation : ${label}`}
        accessibilityHint={onPress ? pressHint : undefined}
      >
        <Icon size={iconSize.sm} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onClear}
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Revenir à la conversation générale"
      >
        <X size={iconSize.sm} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    pill: {
      flexShrink: 1,
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
    },
    main: {
      flexShrink: 1,
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1.5],
      paddingLeft: spacing[3],
      paddingVertical: spacing[1],
    },
    label: { ...font.medium, color: c.primaryDark, flexShrink: 1 },
    clear: {
      width: MIN_TOUCH_TARGET,
      minHeight: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pressed: { opacity: 0.6 },
  };
}
