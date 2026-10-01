import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  bordered?: boolean;
}

export function OfferInfoRow({ icon: Icon, label, value, bordered }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  if (!value.trim()) return null;
  return (
    <Cluster
      gap={spacing[3]}
      align="start"
      style={[styles.row, bordered && styles.bordered]}
      leading={
        <Icon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} style={styles.icon} />
      }
    >
      <View style={styles.body}>
        <AppText style={styles.label}>{label}</AppText>
        <AppText style={styles.value}>{value}</AppText>
      </View>
    </Cluster>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    row: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    bordered: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    icon: { marginTop: spacing[0.5] },
    body: { flex: 1, gap: spacing[0.5], minWidth: 0 },
    label: {
      ...text.caption,
      ...font.medium,
      color: c.textTertiary,
    },
    value: {
      ...text.body,
      color: c.textPrimary,
    },
  };
}
