import type { AppColors } from '@/theme/colors';
import { StyleSheet, View } from 'react-native';
import { Lightbulb, TrendingDown, TrendingUp } from 'lucide-react-native';
import {
  AppText,
  ICON_STROKE_WIDTH,
  font,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';
import type { HealthInsight } from '../utils/health-metric-stats';

interface Props {
  insights: HealthInsight[];
}

function toneColor(tone: HealthInsight['tone'], c: AppColors): string {
  if (tone === 'positive') return c.success;
  if (tone === 'attention') return c.warning;
  return c.textSecondary;
}

function ToneIcon({ tone, color }: { tone: HealthInsight['tone']; color: string }) {
  if (tone === 'positive') return <TrendingUp size={iconSize.md} color={color} strokeWidth={ICON_STROKE_WIDTH} />;
  if (tone === 'attention') return <TrendingDown size={iconSize.md} color={color} strokeWidth={ICON_STROKE_WIDTH} />;
  return <Lightbulb size={iconSize.md} color={color} strokeWidth={ICON_STROKE_WIDTH} />;
}

export function HealthInsightCards({ insights }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  if (insights.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.sectionTitle} accessibilityRole="header">
        Pour vous
      </AppText>
      {insights.map((item) => (
        <View key={item.id} style={styles.card}>
          <ToneIcon tone={item.tone} color={toneColor(item.tone, c)} />
          <View style={styles.texts}>
            <AppText style={styles.cardTitle}>{item.title}</AppText>
            <AppText variant="secondary">{item.body}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    wrap: { gap: spacing[2] },
    sectionTitle: { ...font.semiBold, color: c.textSecondary, paddingHorizontal: spacing[1] },
    card: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    texts: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    cardTitle: { ...text.body, ...font.semiBold, color: c.textPrimary },
  };
}
