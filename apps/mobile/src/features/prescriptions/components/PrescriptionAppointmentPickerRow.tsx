import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { PrescriptionRdvContextRow } from './PrescriptionRdvContextRow';
import {
  batchLotSummaryLabel,
  displayAppointmentForListRow,
  navigateAppointmentForListRow,
  type AppointmentListRow,
} from '@/utils/appointment-batch';
import {spacing, iconSize } from '@/theme';

interface Props {
  row: AppointmentListRow;
  selected: boolean;
  onPick: (row: AppointmentListRow) => void;
}

function rowMatchesSelection(row: AppointmentListRow, selectedId: string): boolean {
  if (!selectedId) return false;
  if (row.kind === 'batch') return row.appointments.some((a) => a.id === selectedId);
  return row.appointment.id === selectedId;
}

export function appointmentPickerRowKey(row: AppointmentListRow): string {
  return row.kind === 'batch' ? row.key : row.appointment.id;
}

export const PrescriptionAppointmentPickerRow = React.memo(function PrescriptionAppointmentPickerRow({
  row,
  selected,
  onPick,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionAppointmentPickerRow');
  const displayApt = displayAppointmentForListRow(row);
  const lotLabel = row.kind === 'batch' ? batchLotSummaryLabel(row.appointments) : '';

  const handlePress = useCallback(() => {
    onPick(row);
  }, [onPick, row]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Cluster
        align="start"
        gap={spacing[3]}
        style={[styles.row, selected && styles.rowSelected]}
        actions={
          selected ? (
            <View style={styles.trailing}>
              <Check size={iconSize.md} color={c.primary} strokeWidth={2.5} />
            </View>
          ) : null
        }
      >
        <PrescriptionRdvContextRow apt={displayApt} lotLabel={lotLabel} />
      </Cluster>
    </Pressable>
  );
});

export { rowMatchesSelection };

function buildStyles(c: AppColors) {
  return {
    row: {
      width: '100%' as const,
      minHeight: 56,
      paddingVertical: spacing[3.5],
      paddingHorizontal: spacing[4],
      backgroundColor: c.surface,
    },
    rowSelected: {
      backgroundColor: c.primaryLight,
    },
    trailing: {
      width: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingTop: spacing[1],
      flexShrink: 0,
    },
  };
}
