import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  appContentSheetShadowStyle,
  appContentSheetSurfaceStyle,
} from '@/components/navigation/header-layout';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Feuille arrondie sous le header — ombre externe + surface clipée. */
export function ContentSheetShell({ children, style }: Props) {
  const styles = useThemedStyles(buildStyles, 'components_navigation_ContentSheetShell_tsx_ContentSheetShell_styles');

  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.surface}>{children}</View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  shadow: appContentSheetShadowStyle(),
  surface: appContentSheetSurfaceStyle(),
};
}
