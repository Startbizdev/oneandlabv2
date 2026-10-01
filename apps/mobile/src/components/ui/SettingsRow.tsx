import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  AppText,
  ICON_STROKE_WIDTH,
  radius,
  spacing,
  iconSize,
  useStyles,
  useTheme,
  font,
  type Theme,
} from '@/theme';
import { ListRowShell } from './ListRowShell';

export interface SettingsRowProps {
  /** Absent avec `leading` absent : ligne sans icône (séparateurs `iconless`). */
  icon?: LucideIcon;
  /** Remplace le puits d'icône (ex. avatar patient). */
  leading?: ReactNode;
  label: string;
  /** Complément en texte secondaire accolé au libellé (ex. « · 42 ans »). */
  labelSuffix?: string;
  /** Précision sous le libellé (ex. « Rappels, messages, résultats »). */
  description?: string;
  /** Valeur courante à droite (ex. « Agrandi »), avant le chevron. */
  value?: string;
  /** Absent : ligne non cliquable (ex. interrupteur passé en `trailing`). */
  onPress?: () => void;
  /** Action sur place (feuille de confirmation, partage) : pas de chevron, réservé à la navigation. */
  inlineAction?: boolean;
  onLongPress?: () => void;
  accessibilityHint?: string;
  /** Compteur d'éléments non lus — pastille turquoise (le rouge reste réservé à l'urgence). */
  badge?: number;
  /** Ligne visible mais inactive (ex. envoi en cours) : non pressable, atténuée. */
  disabled?: boolean;
  /** Contenu à droite (interrupteur, anneau de progression) — remplace valeur, badge et chevron. */
  trailing?: ReactNode;
  destructive?: boolean;
}

const ICON_WELL = 36;

function a11yLabel(
  label: string,
  labelSuffix?: string,
  description?: string,
  value?: string,
  badge?: number,
): string {
  const parts = [labelSuffix ? `${label}${labelSuffix}` : label];
  if (value) parts.push(value);
  if (badge != null && badge > 0) parts.push(`${badge} non lu${badge > 1 ? 's' : ''}`);
  if (description) parts.push(description);
  return parts.join(', ');
}

export function SettingsRow({
  icon: Icon,
  leading,
  label,
  labelSuffix,
  description,
  value,
  onPress,
  inlineAction = false,
  onLongPress,
  accessibilityHint,
  badge,
  disabled = false,
  trailing,
  destructive,
}: SettingsRowProps) {
  const { colors: c } = useTheme();
  const styles = useStyles(buildSettingsStyles);

  const ic = destructive ? c.error : c.textSecondary;
  const ib = destructive ? c.errorLight : c.surfaceAlt;

  const actions = trailing ?? (
    <>
      {value ? (
        <AppText variant="secondary" style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</AppText>
        </View>
      ) : null}
      {onPress && !inlineAction ? (
        <ChevronRight
          size={iconSize.sm}
          color={destructive ? c.error : c.textTertiary}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      ) : null}
    </>
  );

  const row = (
    <ListRowShell
      style={[styles.row, disabled && styles.disabled]}
      leading={
        leading ??
        (Icon ? (
          <View style={[styles.iconWell, { backgroundColor: ib }]}>
            <Icon size={iconSize.md} color={ic} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        ) : undefined)
      }
      body={
        <View style={styles.texts}>
          <AppText style={[styles.label, destructive && styles.labelDestructive]}>
            {label}
            {labelSuffix ? <AppText style={styles.labelSuffix}>{labelSuffix}</AppText> : null}
          </AppText>
          {description ? <AppText variant="caption">{description}</AppText> : null}
        </View>
      }
      trailing={actions}
    />
  );

  if (!onPress) return row;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={a11yLabel(label, labelSuffix, description, value, badge)}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => (pressed && !disabled ? styles.pressed : null)}
    >
      {row}
    </Pressable>
  );
}

export function buildSettingsStyles({ colors: c, fontSize, text, scale }: Theme) {
  return {
    section: { gap: spacing[2] },
    sectionTitle: {
      ...text.caption,
      ...font.semiBold,
      color: c.textSecondary,
      paddingHorizontal: spacing[1],
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    row: {
      minHeight: scale(56),
    },
    pressed: {
      backgroundColor: c.surfaceAlt,
    },
    disabled: {
      opacity: 0.5,
    },
    iconWell: {
      width: ICON_WELL,
      height: ICON_WELL,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    texts: {
      gap: spacing[0.5],
    },
    label: {
      ...text.body,
      ...font.medium,
      color: c.textPrimary,
    },
    labelDestructive: { color: c.error },
    labelSuffix: {
      ...text.secondary,
      color: c.textSecondary,
    },
    value: {
      maxWidth: 140,
      textAlign: 'right' as const,
    },
    /** Séparateur aligné sur le texte (après le puits d'icône), comme les listes natives. */
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing[4] + ICON_WELL + spacing[3],
      backgroundColor: c.borderLight,
    },
    badge: {
      minWidth: 22,
      minHeight: 22,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[1.5],
    },
    badgeText: {
      ...font.semiBold,
      fontSize: fontSize['2xs'],
      color: c.onPrimary,
    },
  };
}
