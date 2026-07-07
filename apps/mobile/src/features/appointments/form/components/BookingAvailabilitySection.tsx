import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useEffect, useMemo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Clock, FastForward, Sparkles, Sun } from 'lucide-react-native';
import {
  PATIENT_VIP_FEE_LABEL,
} from '@oneandlab/shared-constants';
import { BookingTimeRangeSlider } from './BookingTimeRangeSlider';
import {
  availabilityMaxHour,
  availabilitySliderMinHour,
  clampAvailabilityRange,
} from '../utils/booking-availability-utils';
import type { AvailabilityType, UrgentTimingMode } from '../utils/availability';
import { VipScheduledTimePicker } from './VipScheduledTimePicker';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

interface Props {
  scheduledAt: string;
  serviceType?: string;
  availabilityType: AvailabilityType;
  range: [number, number];
  showVipTab?: boolean;
  urgentHour?: number;
  urgentMinute?: number;
  urgentTimingMode?: UrgentTimingMode;
  vipFeeLabel?: string;
  onAvailabilityType: (t: AvailabilityType) => void;
  onRange: (r: [number, number]) => void;
  onUrgentHour?: (h: number) => void;
  onUrgentMinute?: (m: number) => void;
  onUrgentTimingMode?: (m: UrgentTimingMode) => void;
}

const BASE_TABS = [
  { id: 'all_day' as const, label: 'Toute la journée', icon: Sun },
  { id: 'custom' as const, label: 'Créneau horaire', icon: Clock },
];
const VIP_TAB = { id: 'urgent' as const, label: 'Horaire VIP', icon: Sparkles };

export function BookingAvailabilitySection({
  scheduledAt,
  serviceType,
  availabilityType,
  range,
  showVipTab = false,
  urgentHour = 9,
  urgentMinute = 0,
  urgentTimingMode = 'scheduled',
  vipFeeLabel = PATIENT_VIP_FEE_LABEL,
  onAvailabilityType,
  onRange,
  onUrgentHour,
  onUrgentMinute,
  onUrgentTimingMode,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingAvailabilitySection_tsx_styles');
  const maxHour = availabilityMaxHour(serviceType);
  const minHour = useMemo(
    () => availabilitySliderMinHour(scheduledAt, maxHour),
    [scheduledAt, maxHour],
  );
  const tabs = showVipTab ? [...BASE_TABS, VIP_TAB] : BASE_TABS;

  useEffect(() => {
    if (availabilityType !== 'custom') return;
    const clamped = clampAvailabilityRange(range[0], range[1], maxHour, minHour);
    if (clamped[0] !== range[0] || clamped[1] !== range[1]) {
      onRange(clamped);
    }
  }, [availabilityType, maxHour, minHour, scheduledAt, range, onRange]);

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>Disponibilité</AppText>

      <Row gap={spacing[1]} style={styles.segmentShell}>
        {tabs.map((tab) => {
          const on = availabilityType === tab.id;
          const isVip = tab.id === 'urgent';
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onAvailabilityType(tab.id)}
              style={[
                styles.segment,
                on && (isVip ? styles.segmentVipActive : styles.segmentActive),
                isVip && !on && styles.segmentVipIdle,
              ]}
            >
              <Row gap={spacing[1]} align="center" justify="center">
                <Icon
                  size={iconSize.xs}
                  color={isVip ? (on ? '#7c2d12' : '#b45309') : on ? c.primaryDark : c.textTertiary}
                  strokeWidth={2.2}
                />
                <AppText
                  style={[
                    styles.segmentLabel,
                    on && (isVip ? styles.segmentLabelVipActive : styles.segmentLabelActive),
                    isVip && !on && styles.segmentLabelVip,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </AppText>
              </Row>
            </Pressable>
          );
        })}
      </Row>

      {availabilityType === 'custom' ? (
        <BookingTimeRangeSlider
          min={minHour}
          max={maxHour}
          range={range}
          onChange={onRange}
        />
      ) : null}

      {availabilityType === 'urgent' && showVipTab ? (
        <View style={styles.vipCard}>
          <Row gap={spacing[2]} align="start">
            <View style={styles.vipIconWrap}>
              <Sparkles size={iconSize.mdSm} color="#b45309" strokeWidth={2.2} />
            </View>
            <View style={styles.vipTextWrap}>
              <AppText style={styles.vipTitle}>Horaire VIP · {vipFeeLabel}</AppText>
              <AppText style={styles.vipDesc}>
                Priorisation 6h–19h. Au moment de la validation, paiement via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} pour confirmer votre réservation.
              </AppText>
            </View>
          </Row>

          <AppText style={styles.vipWhenLabel}>Quand ?</AppText>
          <Row gap={spacing[2]}>
            <Pressable
              onPress={() => onUrgentTimingMode?.('asap')}
              style={[styles.vipModeBtn, urgentTimingMode === 'asap' && styles.vipModeBtnActive]}
            >
              <FastForward size={iconSize.mdSm} color="#b45309" strokeWidth={2.2} />
              <AppText style={styles.vipModeTitle}>Le plus vite possible</AppText>
              <AppText style={styles.vipModeSub}>Priorisation pour le jour choisi</AppText>
            </Pressable>
            <Pressable
              onPress={() => onUrgentTimingMode?.('scheduled')}
              style={[styles.vipModeBtn, urgentTimingMode === 'scheduled' && styles.vipModeBtnActive]}
            >
              <Clock size={iconSize.mdSm} color="#b45309" strokeWidth={2.2} />
              <AppText style={styles.vipModeTitle}>Heure précise</AppText>
              <AppText style={styles.vipModeSub}>Par pas de 15 min</AppText>
            </Pressable>
          </Row>

          {urgentTimingMode === 'scheduled' ? (
            <VipScheduledTimePicker
              urgentHour={urgentHour}
              urgentMinute={urgentMinute}
              onHourChange={(h) => onUrgentHour?.(h)}
              onMinuteChange={(m) => onUrgentMinute?.(m)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  segmentShell: {
    padding: spacing[0.5],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSubtle,
  },
  segment: {
    minWidth: 0,
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing[1],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  segmentActive: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  segmentVipIdle: {
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.45)',
    backgroundColor: 'rgba(255,251,235,0.85)',
  },
  segmentVipActive: {
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#d97706',
  },
  segmentLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    lineHeight: lh(10, 1.15),
    color: c.textTertiary,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
  segmentLabelActive: {
    color: c.primaryDark,
  },
  segmentLabelVip: {
    color: '#92400e',
  },
  segmentLabelVipActive: {
    color: '#7c2d12',
  },
  vipCard: {
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.25)',
    backgroundColor: c.surface,
    padding: spacing[3],
  },
  vipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  vipTextWrap: {
    minWidth: 0, flex: 1, gap: spacing[1] },
  vipTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  vipDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lh(fontSize.xs, 1.4),
    color: c.textSecondary,
  },
  vipWhenLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  vipModeBtn: {
    minWidth: 0,
    flex: 1,
    gap: spacing[1],
    alignItems: 'center' as const,
    padding: spacing[2.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSubtle,
  },
  vipModeBtnActive: {
    borderColor: 'rgba(217,119,6,0.7)',
    backgroundColor: 'rgba(255,251,235,0.9)',
  },
  vipModeTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  vipModeSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: c.textTertiary,
    textAlign: 'center' as const,
  },
};
}
