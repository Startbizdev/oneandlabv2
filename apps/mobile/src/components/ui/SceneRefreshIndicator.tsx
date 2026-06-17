import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ActivityIndicator, View } from 'react-native';
import { useTabSceneInsets } from '@/components/navigation/liquid-glass-header-inset';
import { useAppColors } from '@/theme/use-app-colors';

type Props = {
  visible: boolean;
};

/**
 * Spinner au bord haut du contenu scrollable (sous le header glass).
 * zIndex < header (20) pour ne pas recouvrir la barre.
 */
export function SceneRefreshIndicator({ visible }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'SceneRefreshIndicator');
  const { insetTop } = useTabSceneInsets();

  if (!visible || insetTop <= 0) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insetTop + 8 }]}>
      <View style={styles.pill}>
        <ActivityIndicator color={c.primary} size="small" />
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    host: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      zIndex: 10,
      alignItems: 'center' as const,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surface,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
  };
}
