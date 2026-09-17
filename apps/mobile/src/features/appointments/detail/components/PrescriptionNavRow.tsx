import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster, Row } from '@/components/layout/primitives';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, FileOutput, type LucideIcon } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  subtitle: string;
  onPress: () => void;
  Icon?: LucideIcon;
  badge?: number;
}

export function PrescriptionNavRow({ title, subtitle, onPress, Icon = FileOutput, badge }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionNavRow');

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <Cluster
        gap={spacing[3]}
        align="center"
        leading={
          <View style={styles.iconWrap}>
            <Icon size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
          </View>
        }
        actions={
          <Row align="center" gap={spacing[2]}>
            {badge ? (
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</AppText>
              </View>
            ) : null}
            <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />
          </Row>
        }
      >
        <View style={styles.body}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        </View>
      </Cluster>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {},
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: spacing[1.5],
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.error,
    },
    badgeText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      color: c.textInverse,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    subtitle: {
      marginTop: 2,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
  } satisfies Parameters<typeof StyleSheet.create>[0];
}
