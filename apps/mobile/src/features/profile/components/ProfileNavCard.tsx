import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  children: ReactNode;
}

export function ProfileNavCard({ title, children }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileNavCard_tsx_ProfileNavCard_styles');

  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
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
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
};
}
