import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { AvailabilityType } from '../utils/availability';
import { BookingAvailabilitySection } from './BookingAvailabilitySection';
import { BookingDateCarousel } from './BookingDateCarousel';
import { spacing } from '@/theme';

interface Props {
  scheduledAt: string;
  serviceType?: string;
  availabilityType: AvailabilityType;
  range: [number, number];
  onScheduledAt: (v: string) => void;
  onAvailabilityType: (t: AvailabilityType) => void;
  onRange: (r: [number, number]) => void;
}

export function FormScheduleSection({
  scheduledAt,
  serviceType,
  availabilityType,
  range,
  onScheduledAt,
  onAvailabilityType,
  onRange,
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
        onAvailabilityType={onAvailabilityType}
        onRange={onRange}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrapper: { gap: spacing[4] },
};
}
