import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster } from '@/components/layout/primitives';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  subtitle?: string;
  Icon?: LucideIcon;
  children: ReactNode;
  noPadding?: boolean;
}

export function DetailPanel({
  title, subtitle, Icon, children, noPadding }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_DetailPanel_tsx_styles');
  return (
    <View style={[styles.panel, elevation.xs]}>
      {title ? (
        <Cluster
          gap={spacing[3]}
          align="start"
          style={styles.header}
          leading={
            Icon ? (
              <View style={styles.iconWrap}>
                <Icon size={iconSize.sm} color={c.primary} strokeWidth={2} />
              </View>
            ) : undefined
          }
        >
          <View style={styles.headerText}>
            <AppText style={styles.title}>{title}</AppText>
            {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
          </View>
        </Cluster>
      ) : null}
      <View style={noPadding ? undefined : styles.body}>{children}</View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  panel: {
    backgroundColor: c.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerText: { gap: 2 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
};
}

