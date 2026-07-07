import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Stack } from '@/components/layout/primitives';
import { hexToRgba } from '@/theme/color-utils';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
import { elevation } from '@/theme/tokens';

/** Gros check centré en absolu — carte effectuée (contenu grisé en dessous). */
export function TourStopCompletedStamp() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.root} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
      <Stack align="center" gap={spacing[2]} style={styles.center}>
        <View style={[styles.circle, { backgroundColor: c.surface, borderColor: c.success, shadowColor: c.textPrimary }]}>
          <Check size={iconSize['3xl']} color={c.success} strokeWidth={3} />
        </View>
        <View style={[styles.labelWrap, { backgroundColor: c.surface }]}>
          <AppText style={[styles.label, { color: c.success }]}>Effectué</AppText>
        </View>
      </Stack>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 5,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: hexToRgba(c.textPrimary, 0.38),
    },
    center: {
      alignItems: 'center' as const,
    },
    circle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 3,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...elevation.md,
    },
    labelWrap: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: 999,
      ...elevation.sm,
    },
    label: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      letterSpacing: 0.4,
    },
  };
}
