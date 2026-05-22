import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
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
import { appointmentListCardStyles as cardStyles } from '@/utils/appointment-list-card-styles';
import { RdvListCardBody } from './RdvListCardBody';
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

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(350).springify()}
      style={[animStyle, cardStyles.cardShell]}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.978, animation.spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, animation.spring.bouncy);
        }}
        onPress={handlePress}
        style={cardStyles.card}
      >
        <View style={styles.inner}>
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
    </Animated.View>
  );
}

export const AppointmentListRowCard = React.memo(AppointmentListRowCardComponent);

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },
});
