import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, View, type ViewProps } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import type { LucideIcon } from 'lucide-react-native';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props extends ViewProps {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  children: React.ReactNode;
}

export function ProfileSection({
  title, description, Icon, children, style, ...rest }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_ProfileSection_tsx_styles');
  return (
    <View style={[styles.card, elevation.xs, style]} {...rest}>
      <Cluster
        gap={spacing[3]}
        align="start"
        leading={
          Icon ? (
            <View style={styles.iconWrap}>
              <Icon size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
            </View>
          ) : undefined
        }
        style={styles.header}
      >
        <View style={styles.headerText}>
          <AppText style={styles.title}>{title}</AppText>
          {description ? <AppText style={styles.description}>{description}</AppText> : null}
        </View>
      </Cluster>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerText: { minWidth: 0, flex: 1, gap: 4 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  body: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
};
}

