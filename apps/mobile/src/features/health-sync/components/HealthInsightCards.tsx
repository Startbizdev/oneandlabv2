import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { Lightbulb, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Stack } from '@/components/layout/primitives';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import { layoutRowCenter } from '@/theme/layout-styles';
import type { HealthInsight } from '../utils/health-metric-stats';

interface Props {
  insights: HealthInsight[];
}

function toneColors(tone: HealthInsight['tone'], c: AppColors) {
  switch (tone) {
    case 'positive':
      return { bg: hexToRgba(c.success, 0.1), border: hexToRgba(c.success, 0.25), accent: c.success };
    case 'attention':
      return { bg: hexToRgba(c.warning, 0.12), border: hexToRgba(c.warning, 0.3), accent: c.warning };
    default:
      return { bg: c.surfaceAlt, border: c.borderLight, accent: c.primary };
  }
}

function ToneIcon({ tone, color }: { tone: HealthInsight['tone']; color: string }) {
  if (tone === 'positive') return <TrendingUp size={iconSize.sm} color={color} strokeWidth={2.25} />;
  if (tone === 'attention') return <TrendingDown size={iconSize.sm} color={color} strokeWidth={2.25} />;
  return <Lightbulb size={iconSize.sm} color={color} strokeWidth={2.25} />;
}

export function HealthInsightCards({ insights }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  if (insights.length === 0) return null;

  return (
    <Stack gap={spacing[2]}>
      <AppText style={styles.sectionTitle}>Pour vous</AppText>
      {insights.map((item) => {
        const colors = toneColors(item.tone, c);
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <ToneIcon tone={item.tone} color={colors.accent} />
              <AppText style={styles.cardTitle}>{item.title}</AppText>
            </View>
            <AppText style={styles.cardBody}>{item.body}</AppText>
          </View>
        );
      })}
    </Stack>
  );
}

function buildStyles(c: AppColors) {
  return {
    sectionTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing[3.5],
      gap: spacing[1.5],
    },
    cardHeader: {
      ...layoutRowCenter(spacing[2]),
    },
    cardTitle: {
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      flex: 1,
    },
    cardBody: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.5,
    },
  };
}
