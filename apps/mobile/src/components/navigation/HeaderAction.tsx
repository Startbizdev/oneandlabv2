import { ActivityIndicator, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { CountBadge, formatCountBadge } from '@/components/navigation/CountBadge';
import { AppText, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const TARGET = 44;

type Props = {
  accessibilityLabel: string;
  onPress: () => void;
  /** Compteur de non-lus affiché en pastille sur l'icône. */
  badge?: number;
  loading?: boolean;
  disabled?: boolean;
} & (
  | { icon: LucideIcon; label?: never }
  /** Action texte courte (1 à 2 mots) à la place de l'icône. */
  | { label: string; icon?: never }
);

/** Action de header — cible 44 pt, sans fond décoratif. */
export function HeaderAction({
  accessibilityLabel,
  onPress,
  icon: Icon,
  label,
  badge,
  loading = false,
  disabled = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const badgeLabel = formatCountBadge(badge);
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={badgeLabel ? `${accessibilityLabel}, ${badgeLabel} non lues` : accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [styles.target, label ? styles.targetText : null, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.primary} />
      ) : label ? (
        <AppText style={styles.label} numberOfLines={1} compact>
          {label}
        </AppText>
      ) : Icon ? (
        <View>
          <Icon size={iconSize.lg} color={c.textPrimary} strokeWidth={1.75} />
          {badgeLabel ? <CountBadge label={badgeLabel} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    target: {
      minWidth: TARGET,
      height: TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.full,
    },
    targetText: {
      paddingHorizontal: spacing[2],
    },
    pressed: {
      opacity: 0.5,
    },
    label: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.primaryDark,
    },
  };
}
