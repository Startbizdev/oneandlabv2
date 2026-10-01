import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { SkeletonList } from '@/components/ui/skeletons';
import { H_PADDING, radius, spacing, useStyles } from '@/theme';

export function TourLoadingSkeleton() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <View style={[styles.stripPlaceholder, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]} />
      <View style={[styles.summaryPlaceholder, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]} />
      <SkeletonList count={3} itemHeight={120} gap={12} />
    </View>
  );
}

function buildStyles() {
  return {
    wrap: {
      paddingHorizontal: H_PADDING,
      gap: spacing[3],
      paddingTop: spacing[2],
    },
    stripPlaceholder: {
      height: 72,
      borderRadius: radius.xl,
      borderWidth: 1,
    },
    summaryPlaceholder: {
      height: 108,
      borderRadius: radius.xl,
      borderWidth: 1,
    },
  };
}
