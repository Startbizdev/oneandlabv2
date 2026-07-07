import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { elevation, radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  children: ReactNode;
}

export function ProfileNavCard({ title, children }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileNavCard_tsx_ProfileNavCard_styles');

  return (
    <View style={styles.section}>
      {title ? <AppText style={styles.sectionTitle}>{title}</AppText> : null}
      <View style={[styles.card, elevation.xs]}>{children}</View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    letterSpacing: 0.2,
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.cardBorder,
    overflow: 'hidden' as const,
  },
};
}
