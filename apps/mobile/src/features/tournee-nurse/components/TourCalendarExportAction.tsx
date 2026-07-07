import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import {radius, spacing, iconSize } from '@/theme';
import { HEADER_ACTION_MARGIN_RIGHT } from '@/navigation/HeaderActionButton';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

/** Ajoute la tournée du jour au calendrier du téléphone. */
export function TourCalendarExportAction({ onPress, loading }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Ajouter la tournée au calendrier"
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <CalendarDays size={iconSize.mdSm} color={c.primary} strokeWidth={2.2} />
        )}
      </Pressable>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      paddingRight: spacing[1],
    },
    btn: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      backgroundColor: c.primaryLight,
      borderWidth: 1,
      borderColor: c.borderLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnPressed: { opacity: 0.88 },
  };
}
