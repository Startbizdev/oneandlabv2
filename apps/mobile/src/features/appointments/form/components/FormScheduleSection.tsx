import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { AvailabilityType, UrgentTimingMode } from '../utils/availability';
import { BookingAvailabilitySection } from './BookingAvailabilitySection';
import { BookingDateCarousel } from './BookingDateCarousel';
import { spacing } from '@/theme';

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
  onScheduledAt: (v: string) => void;
  onAvailabilityType: (t: AvailabilityType) => void;
  onRange: (r: [number, number]) => void;
  onUrgentHour?: (h: number) => void;
  onUrgentMinute?: (m: number) => void;
  onUrgentTimingMode?: (m: UrgentTimingMode) => void;
}

export function FormScheduleSection({
  scheduledAt,
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

  return (
    <View style={styles.wrapper}>
      <BookingDateCarousel value={scheduledAt} onChange={onScheduledAt} />
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
