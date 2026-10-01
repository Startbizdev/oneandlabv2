import { View } from 'react-native';
import { healthRecordSectionIcon } from '../utils/health-record-section-icon';
import { ICON_STROKE_WIDTH, iconSize, radius, useAppColors, useStyles, type Theme } from '@/theme';

interface Props {
  sectionId: string;
}

export function HealthRecordSectionIcon({ sectionId }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const Icon = healthRecordSectionIcon(sectionId);
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no">
      <Icon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
