import { ListRowShell } from '@/components/ui/ListRowShell';
import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { getRdvDetailSectionStyles } from './rdv-detail-section-styles';

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
  edgeToEdge?: boolean;
  style?: StyleProp<ViewStyle>;
}

function buildToneConfig(c: AppColors): Record<
  DetailActionTone,
  { iconBg: string; iconColor: string; labelColor: string; hintColor: string }
> {
  return {
    primary: {
      iconBg: c.primaryLight,
      iconColor: c.primary,
      labelColor: c.textPrimary,
      hintColor: c.textSecondary,
    },
    neutral: {
      iconBg: c.surfaceSubtle,
      iconColor: c.textSecondary,
      labelColor: c.textPrimary,
      hintColor: c.textSecondary,
    },
    caution: {
      iconBg: c.warningLight,
      iconColor: c.warning,
      labelColor: c.textPrimary,
      hintColor: c.textSecondary,
    },
    destructive: {
      iconBg: c.errorLight,
      iconColor: c.error,
      labelColor: c.error,
      hintColor: c.error,
    },
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
  const styles = useThemedStyles(buildStyles, 'DetailActionList');
  const tone = buildToneConfig(c)[action.tone];
  const Icon = action.icon;
  const disabled = action.disabled || action.loading;

  return (
    <Pressable
      disabled={disabled}
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
    >
      {({ pressed }) => (
        <ListRowShell
          topBorder={topBorder}
          leading={
            <View style={[styles.iconWrap, { backgroundColor: tone.iconBg }]}>
              {action.loading ? (
                <ActivityIndicator size="small" color={tone.iconColor} />
              ) : (
                <Icon size={iconSize.md} color={tone.iconColor} strokeWidth={2.25} />
              )}
            </View>
          }
          body={
            <>
              <AppText style={[styles.label, { color: tone.labelColor }]} numberOfLines={2}>
                {action.label}
              </AppText>
              {action.hint ? (
                <AppText style={[styles.hint, { color: tone.hintColor }]} numberOfLines={2}>
                  {action.hint}
                </AppText>
              ) : null}
            </>
          }
          trailing={
            action.showChevron !== false ? (
              <AppText style={styles.chevron} accessibilityElementsHidden>
                ›
              </AppText>
            ) : undefined
          }
          disabled={disabled}
          style={[
            action.tone === 'destructive' && styles.rowDestructive,
            pressed && !disabled && styles.rowPressed,
          ]}
        />
      )}
    </Pressable>
  );
}

export function DetailActionList({ actions, edgeToEdge = false, style }: Props) {
  const section = getRdvDetailSectionStyles();
  if (!actions.length) return null;

  return (
    <View style={[section.card, edgeToEdge && section.cardEdge, style]}>
      {actions.map((action, index) => (
        <ActionRow key={action.key} action={action} topBorder={index > 0} />
      ))}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.3,
  },
  hint: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.35,
  },
  chevron: {
    fontSize: fontSize.xl,
    lineHeight: 24,
    color: c.textTertiary,
  },
  rowDestructive: {
    backgroundColor: c.errorLight,
  },
  rowPressed: {
    backgroundColor: c.surfaceSubtle,
  },
};
}

