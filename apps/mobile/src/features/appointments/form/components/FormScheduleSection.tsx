import { useEffect, useState } from 'react';
import { bookingLeadTimeAfterClosing, nextBookingDateAfterClosing } from '@oneandlab/shared-utils';
import { availabilityMaxHour } from '../utils/booking-availability-utils';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { AvailabilityType, UrgentTimingMode } from '../utils/availability';
import { BookingAvailabilitySection } from './BookingAvailabilitySection';
import { BookingDateCarousel } from './BookingDateCarousel';
import { spacing } from '@/theme';

interface Props {
  scheduledAt: string;
  autoAdvanceClosedDay?: boolean;
  serviceType?: string;
  availabilityType: AvailabilityType;
  range: [number, number];
  showVipTab?: boolean;
  urgentHour?: number;
  urgentMinute?: number;
  urgentTimingMode?: UrgentTimingMode;
  vipFeeLabel?: string;
  onScheduledAt: (v: string) => void;
  onAvailabilityType: (t: AvailabilityType) => void;
  onRange: (r: [number, number]) => void;
  onUrgentHour?: (h: number) => void;
  onUrgentMinute?: (m: number) => void;
  onUrgentTimingMode?: (m: UrgentTimingMode) => void;
}

export function FormScheduleSection({
  scheduledAt,
  autoAdvanceClosedDay = false,
  serviceType,
  availabilityType,
  range,
  showVipTab,
  urgentHour,
  urgentMinute,
  urgentTimingMode,
  vipFeeLabel,
  onScheduledAt,
  onAvailabilityType,
  onRange,
  onUrgentHour,
  onUrgentMinute,
  onUrgentTimingMode,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_FormScheduleSection_tsx_FormScheduleSection_styles');

  const [clockNow, setClockNow] = useState(Date.now);
  const maxHour = availabilityMaxHour(serviceType);
  const advanceClosedDay = autoAdvanceClosedDay && availabilityType !== 'urgent';
  const minLeadTimeHours = advanceClosedDay ? bookingLeadTimeAfterClosing(maxHour, 0, clockNow) : 0;
  useEffect(() => {
    if (!advanceClosedDay) return;
    const timer = setInterval(() => setClockNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [advanceClosedDay]);
  useEffect(() => {
    if (!advanceClosedDay) return;
    const next = nextBookingDateAfterClosing(scheduledAt, maxHour, {}, clockNow);
    if (next) {
      onScheduledAt(next);
      if (range[1] <= range[0]) onRange([9, 11]);
    }
  }, [advanceClosedDay, clockNow, scheduledAt, maxHour, onScheduledAt, onRange, range]);

  return (
    <View style={styles.wrapper}>
      <BookingDateCarousel value={scheduledAt} onChange={onScheduledAt} minLeadTimeHours={minLeadTimeHours} />
      <BookingAvailabilitySection
        scheduledAt={scheduledAt}
        serviceType={serviceType}
        availabilityType={availabilityType}
        range={range}
        showVipTab={showVipTab}
        urgentHour={urgentHour}
        urgentMinute={urgentMinute}
        urgentTimingMode={urgentTimingMode}
        vipFeeLabel={vipFeeLabel}
        onAvailabilityType={onAvailabilityType}
        onRange={onRange}
        onUrgentHour={onUrgentHour}
        onUrgentMinute={onUrgentMinute}
        onUrgentTimingMode={onUrgentTimingMode}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrapper: { gap: spacing[4] },
};
}
