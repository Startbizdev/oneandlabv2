import type { AppColors } from '@/theme/colors';
import { brand, palette } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Route } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { getAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
import type { NurseTourPayload } from '../api/nurse-tour.service';
import { countTourActiveRemainingStops } from '@oneandlab/shared-utils';

const HERO_GRADIENT = [brand.gradientStart, brand.gradientEnd] as const;

type Props = {
  summary: NurseTourPayload['summary'];
  activeRemaining?: number;
};

export function TourSummaryCard({ summary, activeRemaining }: Props) {
  const styles = useThemedStyles(buildStyles);
  const cardStyles = getAppointmentListCardStyles();
  const total = summary.total_stops;
  const done = summary.done_stops;
  const absent = summary.absent_stops ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = activeRemaining ?? Math.max(0, total - done);

  if (total === 0) return null;

  return (
    <View style={[cardStyles.cardShell, styles.shell, elevation.md]}>
      <LinearGradient
        colors={[...HERO_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[cardStyles.card, styles.gradient]}
      >
        <View style={styles.glowOrb} pointerEvents="none" />
        <View style={styles.glowOrbSecondary} pointerEvents="none" />

        <Row gap={spacing[3]} align="center">
          <HealthRecordProgressRing percent={pct} size={56} strokeWidth={4} tone="onGradient" />
          <Stack gap={spacing[0.5]} style={styles.copy}>
            <Text style={styles.kicker}>Ma tournée du jour</Text>
            <Text style={styles.title}>
              {done} sur {total} passage{total > 1 ? 's' : ''}
            </Text>
            <Text style={styles.sub}>
              {remaining > 0
                ? `${remaining} passage${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`
                : 'Bravo, tournée terminée !'}
            </Text>
          </Stack>
        </Row>

        <View style={styles.metrics}>
          <Row gap={spacing[1]} align="center" style={styles.metricItem}>
            <Route size={12} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.metric}>
              {total} étape{total > 1 ? 's' : ''}
            </Text>
          </Row>
          <View style={styles.metricDot} />
          <Row gap={spacing[1]} align="center" style={styles.metricItem}>
            <MapPin size={12} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.metric}>{summary.estimated_km} km estimés</Text>
          </Row>
          {absent > 0 ? (
            <>
              <View style={styles.metricDot} />
              <Text style={styles.metric}>
                {absent} absent{absent > 1 ? 's' : ''}
              </Text>
            </>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  const cardRadius = Platform.select({ ios: radius['2xl'], default: radius.xl });
  return {
    shell: { marginBottom: spacing[2] },
    gradient: {
      borderRadius: cardRadius,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      gap: spacing[2],
      overflow: 'hidden' as const,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hexToRgba('#FFFFFF', 0.22),
    },
    glowOrb: {
      position: 'absolute' as const,
      top: -28,
      right: -22,
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: hexToRgba('#FFFFFF', 0.14),
    },
    glowOrbSecondary: {
      position: 'absolute' as const,
      bottom: -36,
      left: -16,
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: hexToRgba(palette.cyan[600], 0.35),
    },
    copy: { flex: 1, minWidth: 0 },
    kicker: {
      fontFamily: fontFamily.bold,
      fontSize: 10,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
      color: hexToRgba('#FFFFFF', 0.82),
    },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      lineHeight: lh(fontSize.lg),
      letterSpacing: -0.35,
      color: '#FFFFFF',
    },
    sub: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: hexToRgba('#FFFFFF', 0.88),
    },
    metrics: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[1.5],
      paddingTop: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexToRgba('#FFFFFF', 0.22),
    },
    metricItem: { flexShrink: 1 },
    metric: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: hexToRgba('#FFFFFF', 0.92),
    },
    metricDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: hexToRgba('#FFFFFF', 0.45),
    },
  };
}
