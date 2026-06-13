import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Colonne scroll + barre d'action basse.
 * Le wrapper `body` (flex:1, minHeight:0) évite le clip tab navigator.
 */
export function ScreenActionLayout({ children, footer, style }: Props) {
  const styles = useThemedStyles(buildStyles, 'components_layout_ScreenActionLayout_tsx_ScreenActionLayout_styles');

  return (
    <View style={[styles.root, style]}>
      <View style={styles.body}>{children}</View>
      {footer ?? null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
    minHeight: 0,
  },
  body: {
    minWidth: 0,
    flex: 1,
    minHeight: 0,
  },
};
}
