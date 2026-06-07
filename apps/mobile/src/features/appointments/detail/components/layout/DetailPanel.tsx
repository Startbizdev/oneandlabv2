import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  subtitle?: string;
  Icon?: LucideIcon;
  children: ReactNode;
  noPadding?: boolean;
}

export function DetailPanel({ title, subtitle, Icon, children, noPadding }: Props) {
  return (
    <View style={[styles.panel, elevation.xs]}>
      {title ? (
        <View style={styles.header}>
          {Icon ? (
            <View style={styles.iconWrap}>
              <Icon size={16} color={colors.primary} strokeWidth={2} />
            </View>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
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

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_layout_DetailPanel_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
