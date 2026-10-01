import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { layoutRowCenterAll } from '@/theme/layout-styles';

type Props = {
  onPress: () => void;
};

export function PassageFab({ onPress }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing[4] }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={[styles.btn, { backgroundColor: c.primary }, elevation.lg]}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un passage"
      >
        <Plus size={iconSize.mdLg} color={c.textInverse} strokeWidth={2.5} />
        <AppText style={[styles.label, { color: c.textInverse }]}>Ajouter un passage</AppText>
      </Pressable>
    </View>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    wrap: {
      position: 'absolute' as const,
      right: spacing[4],
      zIndex: 20,
    },
    btn: {
      ...layoutRowCenterAll(spacing[2]),
      minHeight: 52,
      paddingHorizontal: spacing[5],
      borderRadius: radius.full,
    },
    label: {
      ...font.semiBold,
      fontSize: fontSize.sm,
    },
  };
}
