import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import {
  PATIENT_VIP_FEE_LABEL,
  PATIENT_VIP_MAX_HOUR,
  PATIENT_VIP_MIN_HOUR,
} from '@oneandlab/shared-constants';
import { BookingTimeRangeSlider } from './BookingTimeRangeSlider';
import {
  availabilityMaxHour,
  availabilitySliderMinHour,
  clampAvailabilityRange,
} from '../utils/booking-availability-utils';
import type { AvailabilityType, UrgentTimingMode } from '../utils/availability';
import { VipScheduledTimePicker } from './VipScheduledTimePicker';
import { vipStoreLabel } from '../utils/booking-wizard-titles';
import { BookingLegalLinks } from './BookingLegalLinks';
import { spacing, AppText, useStyles } from '@/theme';

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

const BASE_TABS: FullWidthSegment<AvailabilityType>[] = [
  { id: 'all_day', label: 'Toute la journée' },
  { id: 'custom', label: 'Créneau horaire' },
];
const VIP_TAB: FullWidthSegment<AvailabilityType> = { id: 'urgent', label: 'Prioritaire' };
const VIP_LEGAL_SLUGS = ['cgv', 'confidentialite'] as const;

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
  const styles = useStyles(buildStyles);
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
      <AppText variant="headline" accessibilityRole="header">À quelle heure ?</AppText>

      <FullWidthSegmentBar
        segments={tabs}
        value={availabilityType}
        onChange={onAvailabilityType}
        accessibilityRole="radiogroup"
        accessibilityLabel="Moment de passage"
      />

      {availabilityType === 'custom' && minHour >= maxHour ? (
        <AppText variant="secondary">Plus de créneau aujourd’hui. Choisissez un autre jour.</AppText>
      ) : availabilityType === 'custom' ? (
        <BookingTimeRangeSlider
          min={minHour}
          max={maxHour}
          range={range}
          onChange={onRange}
        />
      ) : null}

      {availabilityType === 'urgent' && showVipTab ? (
        <View style={styles.vipCard}>
          <View style={styles.vipTextWrap}>
            <AppText variant="headline">Supplément {vipFeeLabel}</AppText>
            <AppText variant="secondary">
              Entre {PATIENT_VIP_MIN_HOUR}h et {PATIENT_VIP_MAX_HOUR}h, réglé via {vipStoreLabel()} à la réservation. Le professionnel doit encore confirmer.
            </AppText>
          </View>
          <BookingLegalLinks slugs={VIP_LEGAL_SLUGS} />

          <View style={styles.vipModes} accessibilityRole="radiogroup">
            <ChoiceCard
              title="Le plus vite possible"
              description="Dans la journée choisie."
              selected={urgentTimingMode === 'asap'}
              onPress={() => onUrgentTimingMode?.('asap')}
            />
            <ChoiceCard
              title="À une heure précise"
              description="Par pas de 15 minutes."
              selected={urgentTimingMode === 'scheduled'}
              onPress={() => onUrgentTimingMode?.('scheduled')}
            />
          </View>

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

function buildStyles() {
  return {
    wrap: { gap: spacing[2] },
    vipCard: {
      gap: spacing[3],
      marginTop: spacing[2],
    },
    vipTextWrap: {
      minWidth: 0,
      gap: spacing[1],
    },
    vipModes: { gap: spacing[2] },
  };
}
