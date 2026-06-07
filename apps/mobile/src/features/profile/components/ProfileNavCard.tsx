import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  children: ReactNode;
}

export function ProfileNavCard({ title, children }: Props) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={[styles.card, elevation.xs]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
});
