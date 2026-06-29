import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Appointment } from '@oneandlab/shared-types';
import {
  type AppointmentListRow,
  isBloodTestOnlyBatchRow,
  isNursingOnlyBatchRow,
  navigateAppointmentForListRow,
} from '@/utils/appointment-batch';
import { appointmentStatusForDisplay } from '@/utils/effective-appointment-status';
import { useAppColors } from '@/theme/use-app-colors';
import { getAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import { listItemEntering, enteringShell } from '@/lib/platform/list-entering-animation';
import { RdvListCardBody } from './RdvListCardBody';
import { buildRdvListCardAccessibilityLabel } from './rdv-list-card-accessibility';
import { spacing, animation } from '@/theme';

interface Props {
  row: AppointmentListRow;
  index?: number;
  onPress: (appointment: Appointment) => void;
  role?: 'patient' | 'nurse' | 'pro' | 'preleveur' | 'lab' | 'demande';
  viewerId?: string | null;
}

function sortBatch(apts: Appointment[]) {
  return [...apts].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
}

function AppointmentListRowCardComponent({
  row,
  index = 0,
  onPress,
  role,
  viewerId,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_components_AppointmentListRowCard_tsx_AppointmentListRowCardComponent_styles');

  useAppColors();
  const cardStyles = getAppointmentListCardStyles();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const navigateTarget = navigateAppointmentForListRow(row);
  const isMergedBatch =
    row.kind === 'batch' && (isBloodTestOnlyBatchRow(row) || isNursingOnlyBatchRow(row));
  const isMultiRdvLot = row.kind === 'batch' && !isMergedBatch;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(navigateTarget);
  }, [onPress, navigateTarget]);

  const primaryApt =
    row.kind === 'batch' ? sortBatch(row.appointments)[0]! : row.appointment;
  const cardRole =
    role === 'demande'
      ? 'demande'
      : role === 'nurse' || role === 'pro' || role === 'preleveur'
        ? role
        : role === 'lab'
          ? 'lab'
          : 'patient';

  const cardStatus = appointmentStatusForDisplay(primaryApt, {
    role: cardRole,
    viewerId,
  });
  const accessibilityLabel = buildRdvListCardAccessibilityLabel(
    primaryApt,
    cardRole,
    cardStatus,
  );

  const entering = listItemEntering(index);
  const EnterShell = enteringShell(entering);
  const CardShell = Platform.OS === 'android' ? View : Animated.View;
  const cardShellProps =
    Platform.OS === 'android' ? { style: cardStyles.cardShell } : { style: [animStyle, cardStyles.cardShell] };

  return (
    <EnterShell entering={entering}>
      <CardShell {...cardShellProps}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.978, animation.spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, animation.spring.bouncy);
        }}
        onPress={handlePress}
        style={cardStyles.card}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View
          style={styles.inner}
          accessible={false}
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          <RdvListCardBody
            row={row}
            primaryApt={primaryApt}
            role={cardRole}
            statusForApt={(apt) =>
              appointmentStatusForDisplay(apt, { role: cardRole, viewerId })
            }
            multiRdvBlocks={isMultiRdvLot && row.kind === 'batch' ? sortBatch(row.appointments) : undefined}
          />
        </View>
      </Pressable>
      </CardShell>
    </EnterShell>
  );
}

export const AppointmentListRowCard = React.memo(AppointmentListRowCardComponent);

function buildStyles(c: AppColors) {
  return {
  inner: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[3.5],
  },
};
}
