import { ListRowShell } from '@/components/ui/ListRowShell';
import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { useRdvDetailSectionStyles } from './rdv-detail-section-styles';

export type DetailActionTone = 'primary' | 'neutral' | 'caution' | 'destructive';

export interface DetailActionItem {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  tone: DetailActionTone;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  showChevron?: boolean;
}

interface Props {
  actions: DetailActionItem[];
  style?: StyleProp<ViewStyle>;
}

/** Turquoise réservé à l'action principale ; les autres restent neutres. */
function buildToneConfig(c: AppColors): Record<
  DetailActionTone,
  { iconBg: string; iconColor: string; labelColor: string }
> {
  return {
    primary: { iconBg: c.primaryLight, iconColor: c.primary, labelColor: c.textPrimary },
    neutral: { iconBg: c.surfaceAlt, iconColor: c.textSecondary, labelColor: c.textPrimary },
    caution: { iconBg: c.warningLight, iconColor: c.warning, labelColor: c.textPrimary },
    destructive: { iconBg: c.errorLight, iconColor: c.error, labelColor: c.error },
  };
}

function ActionRow({
  action,
  topBorder,
}: {
  action: DetailActionItem;
  topBorder: boolean;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const tone = buildToneConfig(c)[action.tone];
  const Icon = action.icon;
  const disabled = action.disabled || action.loading;

  return (
    <Pressable
      disabled={disabled}
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.hint ? `${action.label}, ${action.hint}` : action.label}
      accessibilityState={{ disabled: !!disabled, busy: !!action.loading }}
    >
      {({ pressed }) => (
        <ListRowShell
          topBorder={topBorder}
          leading={
            <View style={[styles.iconWell, { backgroundColor: tone.iconBg }]}>
              {action.loading ? (
                <ActivityIndicator size="small" color={tone.iconColor} />
              ) : (
                <Icon size={iconSize.md} color={tone.iconColor} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </View>
          }
          body={
            <View style={styles.texts}>
              <AppText style={[styles.label, { color: tone.labelColor }]}>{action.label}</AppText>
              {action.hint ? <AppText variant="caption">{action.hint}</AppText> : null}
            </View>
          }
          trailing={
            action.showChevron !== false ? (
              <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
            ) : undefined
          }
          disabled={disabled}
          style={[styles.row, pressed && !disabled && styles.rowPressed]}
        />
      )}
    </Pressable>
  );
}

export function DetailActionList({ actions, style }: Props) {
  const section = useRdvDetailSectionStyles();
  if (!actions.length) return null;

  return (
    <View style={[section.card, style]}>
      {actions.map((action, index) => (
        <ActionRow key={action.key} action={action} topBorder={index > 0} />
      ))}
    </View>
  );
}

function buildStyles({ colors: c, text, scale }: Theme) {
  return {
    row: {
      minHeight: scale(56),
    },
    iconWell: {
      width: 36,
      height: 36,
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
    },
    rowPressed: {
      backgroundColor: c.surfaceAlt,
    },
  };
}
