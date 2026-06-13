import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  bordered?: boolean;
}

export function OfferInfoRow({ icon: Icon, label, value, bordered }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  if (!value.trim()) return null;
  return (
    <Cluster
      gap={spacing[3]}
      align="start"
      style={[styles.row, bordered && styles.bordered]}
      leading={<Icon size={16} color={c.textSecondary} strokeWidth={2} style={styles.icon} />}
    >
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </Cluster>
  );
}

function buildStyles(c: AppColors) {
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
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    value: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.4,
    },
  };
}
