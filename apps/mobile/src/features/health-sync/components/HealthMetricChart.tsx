import { layoutRowEndBetween } from '@/theme/layout-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { LineChart } from 'lucide-react-native';
import type { HealthMetricPoint } from '@oneandlab/shared-types';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  title: string;
  unit: string;
  points: HealthMetricPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  /** Dernier élément d’un groupe — pas de séparateur bas. */
  isLast?: boolean;
}

const VIEWBOX_WIDTH = 280;
const PAD = 8;

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
  const styles = useStyles(buildStyles);

  const { path, lastPoint, last, min, max } = useMemo(() => {
    if (points.length === 0) {
      return { path: '', lastPoint: null, last: null as number | null, min: 0, max: 0 };
    }
    const values = points.map((p) => p.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = maxV - minV || 1;
    const coords = values.map((v, i) => {
      const x = PAD + (i / Math.max(values.length - 1, 1)) * (VIEWBOX_WIDTH - PAD * 2);
      const y = height - PAD - ((v - minV) / span) * (height - PAD * 2);
      return { x, y };
    });
    return {
      path: coords.map((p) => `${p.x},${p.y}`).join(' '),
      lastPoint: coords[coords.length - 1] ?? null,
      last: values[values.length - 1] ?? null,
      min: minV,
      max: maxV,
    };
  }, [height, points]);

  const fmt = formatValue ?? ((v: number) => (Math.round(v * 10) / 10).toLocaleString('fr-FR'));
  const hasCurve = points.length >= 2;
  const firstDate = formatShortDate(points[0]?.recorded_at);
  const lastDate = formatShortDate(points[points.length - 1]?.recorded_at);

  const a11ySummary = hasCurve && last != null
    ? `${title} : dernière valeur ${fmt(last)} ${unit}. Minimum ${fmt(min)}, maximum ${fmt(max)} ${unit}, ` +
      `${points.length} mesures du ${firstDate} au ${lastDate}.`
    : `${title} : pas assez de mesures pour afficher une courbe.`;

  return (
    <View
      style={[styles.wrap, !isLast && styles.wrapDivider]}
      accessible
      accessibilityLabel={a11ySummary}
    >
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
          <View style={styles.plotRow}>
            <View style={[styles.yAxis, { height }]}>
              <AppText style={styles.axisLabel} numberOfLines={1}>{fmt(max)}</AppText>
              <AppText style={styles.axisLabel} numberOfLines={1}>{fmt(min)}</AppText>
            </View>
            <View style={styles.plot}>
              <Svg width="100%" height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}>
                <Line x1={0} y1={PAD} x2={VIEWBOX_WIDTH} y2={PAD} stroke={c.borderLight} strokeWidth={1} strokeDasharray="4 4" />
                <Line
                  x1={0}
                  y1={height - PAD}
                  x2={VIEWBOX_WIDTH}
                  y2={height - PAD}
                  stroke={c.borderLight}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Polyline
                  points={path}
                  fill="none"
                  stroke={c.primary}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {lastPoint ? <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={c.primary} /> : null}
              </Svg>
              <View style={styles.xAxis}>
                <AppText style={styles.axisLabel}>{firstDate}</AppText>
                <AppText style={styles.axisLabel}>{lastDate}</AppText>
              </View>
            </View>
          </View>
          <AppText style={styles.range}>
            {points.length} mesures
          </AppText>
        </>
      ) : (
        <View style={styles.emptyShell}>
          <LineChart size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
          <AppText style={styles.emptyHint}>Pas assez de mesures sur la période</AppText>
        </View>
      )}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },
    wrapDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    header: {
      ...layoutRowEndBetween(spacing[3]),
      marginBottom: spacing[3],
    },
    title: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      letterSpacing: -0.15,
    },
    valueCol: {
      alignItems: 'flex-end' as const,
    },
    value: {
      ...font.heading,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    unit: {
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      marginTop: -2,
    },
    plotRow: {
      flexDirection: 'row' as const,
      gap: spacing[2],
    },
    yAxis: {
      justifyContent: 'space-between' as const,
      alignItems: 'flex-end' as const,
      minWidth: spacing[8],
    },
    plot: {
      flex: 1,
      minWidth: 0,
    },
    xAxis: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: spacing[1],
    },
    axisLabel: {
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    range: {
      ...font.regular,
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
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
    },
  };
}
