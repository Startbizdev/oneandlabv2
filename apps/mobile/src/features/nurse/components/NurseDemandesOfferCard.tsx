import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { RdvListCardBody } from '@/features/appointments/components/RdvListCardBody';
import { buildRdvListCardAccessibilityLabel } from '@/features/appointments/components/rdv-list-card-accessibility';
import { useAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import { listItemEntering, enteringShell } from '@/lib/platform/list-entering-animation';
import { spacing, animation, useStyles, type Theme } from '@/theme';

interface Props {
  row: AppointmentListRow;
  index?: number;
  onPress: (appointment: Appointment) => void;
}

function sortBatch(apts: Appointment[]) {
  return [...apts].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
}

function NurseDemandesOfferCardComponent({ row, index = 0, onPress }: Props) {
  const styles = useStyles(buildStyles);

  const cardStyles = useAppointmentListCardStyles();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const navigateTarget = navigateAppointmentForListRow(row);
  const primaryApt =
    row.kind === 'batch' ? sortBatch(row.appointments)[0]! : row.appointment;
  const isMultiRdvLot =
    row.kind === 'batch' &&
    !(isBloodTestOnlyBatchRow(row) || isNursingOnlyBatchRow(row));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(navigateTarget);
  }, [onPress, navigateTarget]);

  const accessibilityLabel = buildRdvListCardAccessibilityLabel(
    primaryApt,
    'demande',
    'pending',
  );

  const entering = listItemEntering(index);
  const EnterShell = enteringShell(entering);

  return (
    <EnterShell entering={entering}>
      <Animated.View style={[animStyle, cardStyles.cardShell]}>
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
            role="demande"
            statusForApt={() => 'pending'}
            multiRdvBlocks={
              isMultiRdvLot && row.kind === 'batch' ? sortBatch(row.appointments) : undefined
            }
          />
        </View>
      </Pressable>
      </Animated.View>
    </EnterShell>
  );
}

export const NurseDemandesOfferCard = React.memo(NurseDemandesOfferCardComponent);

function buildStyles({ colors: c }: Theme) {
  return {
  inner: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[3.5],
  },
};
}
