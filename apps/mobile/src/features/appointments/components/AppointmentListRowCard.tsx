import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Clock, Layers } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { StatusBadge } from '@/components/ui/Badge';
import {
  type AppointmentListRow,
  batchLotSummaryLabel,
  displayAppointmentForListRow,
  isBloodTestOnlyBatchRow,
  isNursingOnlyBatchRow,
  navigateAppointmentForListRow,
} from '@/utils/appointment-batch';
import {
  appointmentCreneauLabel,
  formatDateCompact,
} from '@/utils/appointment-display';
import { beneficiaryDisplayName } from '@/features/appointments/detail/utils/patient-appointment-display';
import { appointmentStatusForDisplay } from '@/utils/effective-appointment-status';
import { rdvCatalogDisplayLines } from '@/utils/rdv-catalog-lines';
import { colors, elevation, radius, spacing, animation } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  row: AppointmentListRow;
  index?: number;
  onPress: (appointment: Appointment) => void;
  showOfferActions?: boolean;
  onAccept?: () => void;
  onRefuse?: () => void;
  /** Aligne le badge liste sur le détail (ex. infirmier créateur → Confirmé). */
  role?: string;
  viewerId?: string | null;
}

function sortBatch(apts: Appointment[]) {
  return [...apts].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
}

function ScheduleLine({ apt }: { apt: Appointment }) {
  const dateLabel = formatDateCompact(apt.scheduled_at);
  const creneau = appointmentCreneauLabel(apt);
  const line = [dateLabel, creneau].filter(Boolean).join(' · ');
  if (!line) return null;
  return (
    <View style={styles.scheduleRow}>
      <Clock size={12} color={colors.primary} strokeWidth={2.25} />
      <Text style={styles.scheduleText}>{line}</Text>
    </View>
  );
}

function CatalogList({ apt, row }: { apt: Appointment; row: AppointmentListRow }) {
  const displayApt =
    row.kind === 'batch' &&
    (isBloodTestOnlyBatchRow(row) || isNursingOnlyBatchRow(row))
      ? displayAppointmentForListRow(row)
      : apt;
  const lines = rdvCatalogDisplayLines(displayApt);
  if (!lines.length) return null;
  return (
    <View style={styles.catalog}>
      {lines.map((line, i) => (
        <Text key={`${line.category_id ?? 'x'}-${i}`} style={styles.catalogLine} numberOfLines={2}>
          {line.label}
        </Text>
      ))}
    </View>
  );
}

function statusLabel(
  apt: Appointment,
  role?: string,
  viewerId?: string | null,
): string {
  return appointmentStatusForDisplay(apt, { role, viewerId });
}

function AppointmentListRowCardComponent({
  row,
  index = 0,
  onPress,
  showOfferActions,
  onAccept,
  onRefuse,
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
  const isMultiBlockBatch = row.kind === 'batch' && !isMergedBatch;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(navigateTarget);
  }, [onPress, navigateTarget]);

  const primaryApt =
    row.kind === 'batch' ? sortBatch(row.appointments)[0] : row.appointment;
  const patientName = beneficiaryDisplayName(primaryApt);
  const lotLabel = row.kind === 'batch' ? batchLotSummaryLabel(row.appointments) : '';
  const headerStatusApt = isMultiBlockBatch ? null : primaryApt;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(350).springify()}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.978, animation.spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, animation.spring.bouncy);
        }}
        onPress={handlePress}
        style={[styles.card, elevation.sm]}
      >
        <View style={styles.inner}>
          <View style={styles.headRow}>
            <View style={styles.headMain}>
              <Text style={styles.patientName} numberOfLines={1}>
                {patientName}
              </Text>
              {lotLabel ? (
                <View style={styles.lotRow}>
                  <Layers size={11} color={colors.primary} strokeWidth={2.25} />
                  <Text style={styles.lotLabel}>{lotLabel}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headRight}>
              {headerStatusApt ? (
                <StatusBadge
                  status={statusLabel(headerStatusApt, role, viewerId)}
                  size="sm"
                />
              ) : null}
              <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
            </View>
          </View>

          {isMultiBlockBatch && row.kind === 'batch' ? (
            <View style={styles.batchList}>
              {sortBatch(row.appointments).map((apt, idx) => (
                <View
                  key={apt.id}
                  style={[styles.batchBlock, idx > 0 && styles.batchBlockBorder]}
                >
                  <View style={styles.batchBlockHead}>
                    <ScheduleLine apt={apt} />
                    <StatusBadge status={statusLabel(apt, role, viewerId)} size="sm" />
                  </View>
                  <CatalogList apt={apt} row={row} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.meta}>
              <ScheduleLine apt={primaryApt} />
              <CatalogList apt={primaryApt} row={row} />
            </View>
          )}
        </View>

        {showOfferActions && onAccept && onRefuse ? (
          <View style={styles.offerActions}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRefuse();
              }}
              style={[styles.offerBtn, styles.refuseBtn]}
            >
              <Text style={[styles.offerBtnText, styles.refuseBtnText]}>Refuser</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onAccept();
              }}
              style={[styles.offerBtn, styles.acceptBtn]}
            >
              <Text style={[styles.offerBtnText, styles.acceptBtnText]}>Accepter</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export const AppointmentListRowCard = React.memo(AppointmentListRowCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  inner: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    gap: spacing[2.5],
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  headMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  headRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: 1,
  },
  patientName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lotLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.primary,
  },
  meta: {
    gap: spacing[1.5],
    paddingTop: spacing[0.5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  scheduleText: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  catalog: {
    gap: 2,
  },
  catalogLine: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.35,
  },
  batchList: {
    gap: spacing[2.5],
    paddingTop: spacing[0.5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  batchBlock: { gap: spacing[1.5] },
  batchBlockBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[2.5],
  },
  batchBlockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  offerActions: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  offerBtn: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  refuseBtn: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.errorMid,
  },
  acceptBtn: { backgroundColor: colors.primary },
  offerBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
  refuseBtnText: { color: colors.error },
  acceptBtnText: { color: colors.textInverse },
});
