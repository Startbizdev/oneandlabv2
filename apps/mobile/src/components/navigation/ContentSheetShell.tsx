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
  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.surface}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: appContentSheetShadowStyle(),
  surface: appContentSheetSurfaceStyle(),
});
