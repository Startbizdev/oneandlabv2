import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Badge } from '@/components/ui/Badge';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  filled: number;
  total: number;
}

export function HealthRecordSectionProgress({ filled, total }: Props) {
  const styles = useThemedStyles(buildStyles, 'HealthRecordSectionProgress');
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(1, Math.max(0, filled / safeTotal));
  const missing = Math.max(0, total - filled);
  const complete = filled >= total && total > 0;

  const badgeVariant = complete ? 'success' : missing > 0 ? 'warning' : 'neutral';
  const badgeLabel = complete ? 'Complet' : `${filled}/${total}`;

  const caption = complete
    ? 'Toutes les informations sont renseignées'
    : missing === 1
      ? '1 information non renseignée'
      : `${missing} informations non renseignées`;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${filled} sur ${total} renseignées. ${caption}`}
    >
      <Row gap={spacing[2]} align="center" justify="between">
        <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
          <View
            style={[
              styles.fill,
              { width: `${Math.round(ratio * 100)}%` },
              ratio > 0 && ratio < 1 ? styles.fillPartial : null,
            ]}
          />
        </View>
        <Badge label={badgeLabel} variant={badgeVariant} dot={false} size="sm" shape="square" />
      </Row>
      <AppText style={styles.caption}>{caption}</AppText>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      gap: spacing[1],
      marginTop: spacing[1],
    },
    track: {
      minWidth: 0,
      flex: 1,
      height: 6,
      borderRadius: radius.full,
      backgroundColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    fill: {
      height: '100%' as const,
      borderRadius: radius.full,
      backgroundColor: c.success,
    },
    fillPartial: {
      minWidth: 6,
    },
    caption: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
  };
}
