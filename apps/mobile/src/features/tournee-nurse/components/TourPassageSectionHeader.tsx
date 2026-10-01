import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const FILTER_SIZE = spacing[8];

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
  const styles = useStyles(buildStyles);

  return (
    <Row align="center" gap={spacing[1.5]} style={styles.row}>
      <AppText style={[styles.title, { color: c.textPrimary }]}>Passages</AppText>
      <View style={styles.spacer}>
        {absentCount > 0 && activeTotal > 0 ? (
          <AppText style={[styles.absentHint, { color: c.textSecondary }]}>
            {absentCount} absent{absentCount > 1 ? 's' : ''}
          </AppText>
        ) : null}
      </View>
      <Pressable
        onPress={onOpenFilter}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.filterBtn, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}
        accessibilityRole="button"
        accessibilityLabel="Filtrer l'ordre des passages"
      >
        <SlidersHorizontal size={iconSize.sm} color={sortActive ? c.primary : c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        {sortActive ? (
          <View style={[styles.dot, { backgroundColor: c.primary, borderColor: c.surfaceAlt }]} />
        ) : null}
      </Pressable>
    </Row>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    row: {
      marginBottom: spacing[2],
      alignSelf: 'stretch' as const,
    },
    title: {
      ...font.semiBold,
      fontSize: fontSize.base,
    },
    spacer: { flex: 1, minWidth: 0 },
    absentHint: {
      ...font.medium,
      fontSize: fontSize.xs,
    },
    filterBtn: {
      width: FILTER_SIZE,
      height: FILTER_SIZE,
      borderRadius: radius.full,
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
