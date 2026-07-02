import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  onPress: () => void;
};

export function PassageFab({ onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing[4] }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={[styles.btn, { backgroundColor: c.primary }, elevation.lg]}
        accessibilityRole="button"
        accessibilityLabel="Ajouter un passage"
      >
        <Plus size={22} color={c.textInverse} strokeWidth={2.5} />
        <Text style={[styles.label, { color: c.textInverse }]}>Ajouter un passage</Text>
      </Pressable>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    wrap: {
      position: 'absolute' as const,
      right: spacing[4],
      zIndex: 20,
    },
    btn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[2],
      minHeight: 52,
      paddingHorizontal: spacing[5],
      borderRadius: radius.full,
    },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
    },
  };
}
