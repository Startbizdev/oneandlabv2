import { layoutRowEndBetween } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { LineChart } from 'lucide-react-native';
import type { HealthMetricPoint } from '@oneandlab/shared-types';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  unit: string;
  points: HealthMetricPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  /** Dernier élément d’un groupe — pas de séparateur bas. */
  isLast?: boolean;
}

export function HealthMetricChart({
  title,
  unit,
  points,
  height = 132,
  formatValue,
  isLast = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'HealthMetricChart');

  const { path, last, min, max } = useMemo(() => {
    if (points.length === 0) {
      return { path: '', last: null as number | null, min: 0, max: 0 };
    }
    const values = points.map((p) => p.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = maxV - minV || 1;
    const width = 280;
    const pad = 12;
    const coords = values.map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((v - minV) / span) * (height - pad * 2);
      return `${x},${y}`;
    });
    return { path: coords.join(' '), last: values[values.length - 1] ?? null, min: minV, max: maxV };
  }, [height, points]);

  const fmt = formatValue ?? ((v: number) => String(Math.round(v * 10) / 10));
  const hasCurve = points.length >= 2;

  return (
    <View style={[styles.wrap, !isLast && styles.wrapDivider]}>
      <View style={styles.header}>
        <AppText style={styles.title}>{title}</AppText>
        {last != null ? (
          <View style={styles.valueCol}>
            <AppText style={styles.value}>{fmt(last)}</AppText>
            <AppText style={styles.unit}>{unit}</AppText>
          </View>
        ) : null}
      </View>

      {hasCurve ? (
        <>
          <Svg width="100%" height={height} viewBox={`0 0 280 ${height}`}>
            <Polyline points={path} fill="none" stroke={c.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {path.split(' ').slice(-1).map((pt) => {
              const [x, y] = pt.split(',').map(Number);
              return <Circle key={pt} cx={x} cy={y} r={4} fill={c.primary} />;
            })}
          </Svg>
          <AppText style={styles.range}>
            {fmt(min)}–{fmt(max)} · {points.length} pts
          </AppText>
        </>
      ) : (
        <View style={styles.emptyShell}>
          <LineChart size={iconSize.md} color={c.textTertiary} strokeWidth={1.75} />
          <AppText style={styles.emptyHint}>—</AppText>
        </View>
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },
    wrapDivider: {
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    header: {
      ...layoutRowEndBetween(spacing[3]),
      marginBottom: spacing[3],
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      letterSpacing: -0.15,
    },
    valueCol: {
      alignItems: 'flex-end' as const,
    },
    value: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    unit: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      marginTop: -2,
    },
    range: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      marginTop: spacing[2],
    },
    emptyShell: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1],
      paddingVertical: spacing[8],
      borderRadius: radius.lg,
      backgroundColor: c.surfaceAlt,
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
    },
    emptyHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
    },
  };
}
