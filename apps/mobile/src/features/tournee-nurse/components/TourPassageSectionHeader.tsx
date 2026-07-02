import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  sortActive: boolean;
  onOpenFilter: () => void;
};

export function TourPassageSectionHeader({ sortActive, onOpenFilter }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <Row align="center" gap={spacing[1.5]} style={styles.row}>
      <Text style={[styles.title, { color: c.textTertiary }]}>Passage</Text>
      <Pressable
        onPress={onOpenFilter}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.filterBtn, { backgroundColor: c.surfaceAlt, borderColor: c.borderLight }]}
        accessibilityRole="button"
        accessibilityLabel="Filtrer l'ordre des passages"
      >
        <SlidersHorizontal size={16} color={sortActive ? c.primary : c.textSecondary} strokeWidth={2.2} />
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
