import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster } from '@/components/layout/primitives';
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

export function DetailSection({
  title, Icon, children, plain, compact }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_DetailSection_tsx_styles');
  return (
    <View style={[styles.wrap, plain && styles.plain, compact && styles.compact]}>
      {title ? (
        <Cluster
          gap={spacing[2]}
          align="center"
          leading={
            Icon ? (
              <View style={styles.iconWrap}>
                <Icon size={14} color={c.primary} strokeWidth={2} />
              </View>
            ) : undefined
          }
        >
          <Text style={styles.title}>{title}</Text>
        </Cluster>
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
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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

