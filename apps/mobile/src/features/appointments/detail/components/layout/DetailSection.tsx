import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
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

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  body: {
    gap: spacing[2],
  },
});
