import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  Icon?: LucideIcon;
  children: ReactNode;
  /** Sans carte (contenu directement sur fond écran) */
  plain?: boolean;
  /** Liste dense (lignes contact / assignés). */
  compact?: boolean;
}

export function DetailSection({ title, Icon, children, plain, compact }: Props) {
  return (
    <View style={[styles.wrap, plain && styles.plain, compact && styles.compact]}>
      {title ? (
        <View style={styles.head}>
          {Icon ? (
            <View style={styles.iconWrap}>
              <Icon size={14} color={colors.primary} strokeWidth={2} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={[styles.body, compact && styles.bodyCompact]}>{children}</View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  plain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  compact: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    gap: 0,
  },
  bodyCompact: {
    gap: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  body: {
    gap: spacing[2],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_layout_DetailSection_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
