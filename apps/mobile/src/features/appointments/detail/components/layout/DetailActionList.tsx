import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { rdvDetailSectionStyles } from './rdv-detail-section-styles';

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

const toneConfig: Record<
  DetailActionTone,
  { iconBg: string; iconColor: string; labelColor: string; hintColor: string }
> = {
  primary: {
    iconBg: colors.primaryLight,
    iconColor: colors.primary,
    labelColor: colors.textPrimary,
    hintColor: colors.textSecondary,
  },
  neutral: {
    iconBg: colors.surfaceSubtle,
    iconColor: colors.textSecondary,
    labelColor: colors.textPrimary,
    hintColor: colors.textSecondary,
  },
  caution: {
    iconBg: colors.warningLight,
    iconColor: colors.warning,
    labelColor: colors.textPrimary,
    hintColor: colors.textSecondary,
  },
  destructive: {
    iconBg: colors.errorLight,
    iconColor: colors.error,
    labelColor: colors.error,
    hintColor: colors.error,
  },
};

function ActionRow({
  action,
  topBorder,
}: {
  action: DetailActionItem;
  topBorder: boolean;
}) {
  const tone = toneConfig[action.tone];
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
      <View
        style={[
          styles.row,
          topBorder && rdvDetailSectionStyles.rowBorder,
          action.tone === 'destructive' && styles.rowDestructive,
          pressed && !disabled && styles.rowPressed,
          disabled && styles.rowDisabled,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: tone.iconBg }]}>
          {action.loading ? (
            <ActivityIndicator size="small" color={tone.iconColor} />
          ) : (
            <Icon size={20} color={tone.iconColor} strokeWidth={2.25} />
          )}
        </View>

        <View style={styles.rowBody}>
          <Text style={[styles.label, { color: tone.labelColor }]} numberOfLines={2}>
            {action.label}
          </Text>
          {action.hint ? (
            <Text style={[styles.hint, { color: tone.hintColor }]} numberOfLines={2}>
              {action.hint}
            </Text>
          ) : null}
        </View>

        {action.showChevron !== false ? (
          <Text style={styles.chevron} accessibilityElementsHidden>
            ›
          </Text>
        ) : null}
      </View>
      )}
    </Pressable>
  );
}

export function DetailActionList({ actions, edgeToEdge = false, style }: Props) {
  if (!actions.length) return null;

  return (
    <View style={[rdvDetailSectionStyles.card, edgeToEdge && rdvDetailSectionStyles.cardEdge, style]}>
      {actions.map((action, index) => (
        <ActionRow key={action.key} action={action} topBorder={index > 0} />
      ))}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
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
    fontSize: 22,
    lineHeight: 24,
    color: c.textTertiary,
  },
  rowDestructive: {
    backgroundColor: c.errorLight,
  },
  rowPressed: {
    backgroundColor: c.surfaceSubtle,
  },
  rowDisabled: {
    opacity: 0.5,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_layout_DetailActionList_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
