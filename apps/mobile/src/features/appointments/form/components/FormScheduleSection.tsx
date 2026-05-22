import { StyleSheet, View } from 'react-native';
import { BookingAvailabilitySection } from './BookingAvailabilitySection';
import { BookingDateCarousel } from './BookingDateCarousel';
import { spacing } from '@/theme';

interface Props {
  scheduledAt: string;
  serviceType?: string;
  availabilityType: 'all_day' | 'custom';
  range: [number, number];
  onScheduledAt: (v: string) => void;
  onAvailabilityType: (t: 'all_day' | 'custom') => void;
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

const styles = StyleSheet.create({
  wrapper: { gap: spacing[4] },
});
