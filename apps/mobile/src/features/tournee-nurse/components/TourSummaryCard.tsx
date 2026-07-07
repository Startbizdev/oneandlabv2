import { layoutRowWrap } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { brand, palette } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Route } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { getAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import { elevation, radius, spacing, iconSize, progressRingSize, AppText } from '@/theme';
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
  const allAbsentOnly = total === 0 && absent > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = activeRemaining ?? Math.max(0, total - done);

  if (total === 0 && absent === 0) return null;

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
          <HealthRecordProgressRing percent={allAbsentOnly ? 0 : pct} size={progressRingSize.md} strokeWidth={4} tone="onGradient" />
          <Stack gap={spacing[0.5]} style={styles.copy}>
            <AppText style={styles.kicker}>Ma tournée du jour</AppText>
            {allAbsentOnly ? (
              <>
                <AppText style={styles.title}>Pas de tournée du jour</AppText>
                <AppText style={styles.sub}>
                  Vous avez {absent} patient{absent > 1 ? 's' : ''} absent{absent > 1 ? 's' : ''}
                </AppText>
              </>
            ) : (
              <>
                <AppText style={styles.title}>
                  {done} sur {total} passage{total > 1 ? 's' : ''}
                </AppText>
                <AppText style={styles.sub}>
                  {remaining > 0
                    ? `${remaining} passage${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`
                    : 'Bravo, tournée terminée !'}
                </AppText>
              </>
            )}
          </Stack>
        </Row>

        {!allAbsentOnly ? (
          <View style={styles.metrics}>
            <Row gap={spacing[1]} align="center" style={styles.metricItem}>
              <Route size={iconSize['2xs']} color="#FFFFFF" strokeWidth={2.2} />
              <AppText style={styles.metric}>
                {total} étape{total > 1 ? 's' : ''}
              </AppText>
            </Row>
            <View style={styles.metricDot} />
            <Row gap={spacing[1]} align="center" style={styles.metricItem}>
              <MapPin size={iconSize['2xs']} color="#FFFFFF" strokeWidth={2.2} />
              <AppText style={styles.metric}>{summary.estimated_km} km estimés</AppText>
            </Row>
            {absent > 0 ? (
              <>
                <View style={styles.metricDot} />
                <AppText style={styles.metric}>
                  {absent} absent{absent > 1 ? 's' : ''}
                </AppText>
              </>
            ) : null}
          </View>
        ) : null}
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
      fontSize: fontSize['2xs'],
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
      ...layoutRowWrap(spacing[1.5]),
      alignItems: 'center' as const,
      paddingTop: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexToRgba('#FFFFFF', 0.22),
    },
    metricItem: {
    minWidth: 0, flexShrink: 1 },
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
