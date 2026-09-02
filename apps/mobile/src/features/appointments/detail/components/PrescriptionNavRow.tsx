import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster } from '@/components/layout/primitives';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, FileOutput } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function PrescriptionNavRow({ title, subtitle, onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionNavRow');

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <Cluster
        gap={spacing[3]}
        align="center"
        leading={
          <View style={styles.iconWrap}>
            <FileOutput size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
          </View>
        }
        actions={<ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
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
  return StyleSheet.create({
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
  });
}
