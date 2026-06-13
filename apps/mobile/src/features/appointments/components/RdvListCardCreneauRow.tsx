import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Clock } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { buildRdvListCardTypography } from '@/features/appointments/components/rdv-list-card-typography';
import { spacing } from '@/theme';

const CLOCK_SIZE = 14;

interface Props {
  label: string;
  status: string;
}

export function RdvListCardCreneauRow({ label, status }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'RdvListCardCreneauRow');

  return (
    <Cluster
      gap={spacing[2]}
      align="start"
      style={styles.row}
      actions={
        <View accessible={false} importantForAccessibility="no" style={styles.statusWrap}>
          <StatusBadge status={status} size="sm" dotOnly />
        </View>
      }
    >
      {label ? (
        <Row gap={spacing[1.5]} align="start">
          <View style={styles.iconWrap}>
            <Clock size={CLOCK_SIZE} color={c.textTertiary} strokeWidth={2} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        </Row>
      ) : null}
    </Cluster>
  );
}

function buildStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  const labelLine = type.slot.lineHeight;

  return {
    row: {
      minWidth: 0,
      width: '100%' as const,
    },
    iconWrap: {
      flexShrink: 0,
      marginTop: Math.max(0, (labelLine - CLOCK_SIZE) / 2 - 1),
    },
    label: {
      ...type.slot,
      flex: 1,
      minWidth: 0,
    },
    statusWrap: {
      flexShrink: 0,
      marginTop: Math.max(0, (labelLine - 12) / 2),
    },
  };
}
