import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  sortActive: boolean;
  absentCount?: number;
  activeTotal?: number;
  onOpenFilter: () => void;
};

export function TourPassageSectionHeader({
  sortActive,
  absentCount = 0,
  activeTotal = 0,
  onOpenFilter,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <Row align="center" gap={spacing[1.5]} style={styles.row}>
      <AppText style={[styles.title, { color: c.textTertiary }]}>Passage</AppText>
      {absentCount > 0 && activeTotal > 0 ? (
        <AppText style={[styles.absentHint, { color: c.textSecondary }]}>
          {absentCount} absent{absentCount > 1 ? 's' : ''}
        </AppText>
      ) : null}
      <Pressable
        onPress={onOpenFilter}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.filterBtn, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}
        accessibilityRole="button"
        accessibilityLabel="Filtrer l'ordre des passages"
      >
        <SlidersHorizontal size={iconSize.sm} color={sortActive ? c.primary : c.textSecondary} strokeWidth={2.2} />
        {sortActive ? (
          <View style={[styles.dot, { backgroundColor: c.primary, borderColor: c.surfaceAlt }]} />
        ) : null}
      </Pressable>
    </Row>
  );
}

function buildStyles(_c: AppColors) {
  return {
    row: {
      marginBottom: spacing[2],
      alignSelf: 'stretch' as const,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
    },
    absentHint: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
    },
    filterBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dot: {
      position: 'absolute' as const,
      top: 4,
      right: 4,
      width: 7,
      height: 7,
      borderRadius: 4,
      borderWidth: 1.5,
    },
  };
}
