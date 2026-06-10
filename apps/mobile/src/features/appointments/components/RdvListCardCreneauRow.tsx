import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Clock } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
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
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.row}>
      {label ? (
        <View style={styles.main}>
          <View style={styles.iconWrap}>
            <Clock size={CLOCK_SIZE} color={c.textTertiary} strokeWidth={2} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        </View>
      ) : (
        <View style={styles.main} />
      )}
      <View accessible={false} importantForAccessibility="no" style={styles.statusWrap}>
        <StatusBadge status={status} size="sm" dotOnly />
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  const labelLine = type.slot.lineHeight;

  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      gap: spacing[2],
    },
    main: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      minWidth: 0,
      gap: spacing[1.5],
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
      marginLeft: 'auto',
      marginTop: Math.max(0, (labelLine - 12) / 2),
    },
  });
}
