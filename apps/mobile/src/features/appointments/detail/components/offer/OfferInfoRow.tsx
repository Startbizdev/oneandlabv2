import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

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
      leading={<Icon size={iconSize.sm} color={c.textSecondary} strokeWidth={2} style={styles.icon} />}
    >
      <View style={styles.body}>
        <AppText style={styles.label}>{label}</AppText>
        <AppText style={styles.value}>{value}</AppText>
      </View>
    </Cluster>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
    icon: { marginTop: 2 },
    body: { flex: 1, gap: 2, minWidth: 0 },
    label: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    value: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.4,
    },
  };
}
