import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Footprints } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import { DAILY_STEPS_GOAL } from '../utils/health-metric-stats';

interface Props {
  todaySteps: number | null;
  avgSteps7d: number | null;
  lastHeartRate: number | null;
  lastWeight: number | null;
}

export function HealthActivityHero({ todaySteps, avgSteps7d, lastHeartRate, lastWeight }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  const stepsDisplay = todaySteps ?? avgSteps7d;
  const goalPct =
    stepsDisplay != null ? Math.min(100, Math.round((stepsDisplay / DAILY_STEPS_GOAL) * 100)) : 0;
  const ringSize = 112;
  const stroke = 10;
  const r = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (goalPct / 100) * circumference;

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.borderLight }]}>
      <Row gap={spacing[4]} align="center">
        <View style={styles.ringWrap}>
          <Svg width={ringSize} height={ringSize}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke={hexToRgba(c.primary, 0.15)}
              strokeWidth={stroke}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke={c.primary}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Footprints size={iconSize.mdSm} color={c.primary} strokeWidth={2.25} />
            <AppText style={styles.ringValue}>
              {stepsDisplay != null ? stepsDisplay.toLocaleString('fr-FR') : '—'}
            </AppText>
            <AppText style={styles.ringUnit}>pas</AppText>
          </View>
        </View>

        <Stack gap={spacing[2]} style={styles.meta}>
          <AppText style={styles.title}>
            {todaySteps != null ? 'Aujourd’hui' : 'Activité (7 j)'}
          </AppText>
          <AppText style={styles.goal}>
            {goalPct} % de l’objectif {DAILY_STEPS_GOAL.toLocaleString('fr-FR')} pas
          </AppText>
          {avgSteps7d != null ? (
            <AppText style={styles.sub}>Moyenne {Math.round(avgSteps7d).toLocaleString('fr-FR')} pas/j</AppText>
          ) : null}
          <Row gap={spacing[4]}>
            {lastHeartRate != null ? (
              <View>
                <AppText style={styles.miniLabel}>FC</AppText>
                <AppText style={styles.miniValue}>{Math.round(lastHeartRate)} bpm</AppText>
              </View>
            ) : null}
            {lastWeight != null ? (
              <View>
                <AppText style={styles.miniLabel}>Poids</AppText>
                <AppText style={styles.miniValue}>{lastWeight} kg</AppText>
              </View>
            ) : null}
          </Row>
        </Stack>
      </Row>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing[4],
    },
    ringWrap: {
      width: 112,
      height: 112,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    ringCenter: {
      position: 'absolute' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[0.5],
    },
    ringValue: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    ringUnit: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    meta: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    goal: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.primary,
    },
    sub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    miniLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize['2xs'],
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    miniValue: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
  };
}
