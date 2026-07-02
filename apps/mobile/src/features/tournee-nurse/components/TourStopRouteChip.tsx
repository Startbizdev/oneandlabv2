import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, Text, View } from 'react-native';
import { Car, Route } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import { resolveTourStopRouteMetrics } from '@oneandlab/shared-utils';
import type { NurseTourStop } from '../api/nurse-tour.service';

type Props = {
  stop: NurseTourStop;
};

export function TourStopRouteChip({ stop }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const metrics = resolveTourStopRouteMetrics(stop);
  if (!metrics) return null;

  const kmLabel = `${metrics.km.toFixed(1)} km`;
  const minLabel = metrics.min > 0 ? `~${metrics.min} min` : '—';

  return (
    <View
      style={[styles.chip, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}
      accessibilityLabel={`Trajet depuis le passage précédent : ${kmLabel}, environ ${metrics.min} minutes`}
    >
      <Row gap={spacing[1]} align="center" style={styles.segment}>
        <Route size={11} color={c.textSecondary} strokeWidth={2.4} />
        <Text style={[styles.value, { color: c.textSecondary }]}>{kmLabel}</Text>
      </Row>
      <View style={[styles.divider, { backgroundColor: hexToRgba(c.textTertiary, 0.28) }]} />
      <Row gap={spacing[1]} align="center" style={styles.segment}>
        <Car size={11} color={c.textSecondary} strokeWidth={2.4} />
        <Text style={[styles.value, { color: c.textSecondary }]}>{minLabel}</Text>
      </Row>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-end' as const,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      gap: spacing[1.5],
    },
    segment: { flexShrink: 0 },
    divider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch' as const,
      marginVertical: 1,
    },
    value: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      letterSpacing: -0.1,
    },
  };
}
