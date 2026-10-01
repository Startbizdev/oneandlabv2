import { View } from 'react-native';
import { healthRecordSectionEmoji } from '../utils/health-record-section-emoji';
import { radius, AppText, useStyles, type Theme } from '@/theme';

interface Props {
  sectionId: string;
  size?: 'md' | 'lg';
}

export function HealthRecordSectionEmoji({ sectionId, size = 'md' }: Props) {
  const styles = useStyles(buildStyles);
  const emoji = healthRecordSectionEmoji(sectionId);

  return (
    <View
      style={[styles.wrap, size === 'lg' && styles.wrapLg]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <AppText style={[styles.emoji, size === 'lg' && styles.emojiLg]}>{emoji}</AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    wrapLg: {
      width: 44,
      height: 44,
    },
    emoji: {
      fontSize: fontSize.xl,
      lineHeight: 26,
    },
    emojiLg: {
      fontSize: fontSize['2xl'],
      lineHeight: 28,
    },
  };
}
