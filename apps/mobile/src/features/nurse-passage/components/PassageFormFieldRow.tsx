import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { MoreHorizontal, Pencil, type LucideIcon } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';

type Props = {
  label: string;
  value: string;
  empty?: boolean;
  /** `action` = ligne actions (icône ⋯, fond accent). */
  variant?: 'edit' | 'action';
  onPress: () => void;
};

export function PassageFormFieldRow({
  label,
  value,
  empty,
  variant = 'edit',
  onPress,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const isAction = variant === 'action';
  const Icon: LucideIcon = isAction ? MoreHorizontal : Pencil;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: isAction ? c.primaryMid : c.borderLight,
          backgroundColor: isAction ? c.primaryLight : c.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}, ${isAction ? 'ouvrir' : 'modifier'}`}
    >
      <Cluster
        align="center"
        actions={
          <View
            style={[
              styles.iconBtn,
              { backgroundColor: isAction ? c.surface : c.surfaceAlt },
            ]}
          >
            <Icon size={iconSize.sm} color={c.primary} strokeWidth={2.2} />
          </View>
        }
      >
        <View style={styles.textCol}>
          <AppText style={[styles.label, { color: c.textTertiary }]}>{label}</AppText>
          <AppText
            style={[
              styles.value,
              { color: empty ? c.textTertiary : c.textPrimary },
            ]}
            numberOfLines={3}
          >
            {value}
          </AppText>
        </View>
      </Cluster>
    </Pressable>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    row: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
    },
    textCol: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    label: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    value: {
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.4),
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
