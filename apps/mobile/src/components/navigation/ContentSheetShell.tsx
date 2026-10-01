import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  appContentSheetShadowStyle,
  appContentSheetSurfaceStyle,
  appTabSceneFlatContentStyle,
} from '@/components/navigation/header-layout';
import { tabSceneLayoutHandler } from '@/lib/debug/tab-scene-layout-debug';
import { useStyles } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Corps plein écran — scroll sous header / tab bar glass (padding sur le scroll, pas ici). */
  edgeToEdge?: boolean;
  debugLabel?: string;
}

/** Conteneur onglet bord à bord — la tab bar native flotte par-dessus. */
export function ContentSheetShell({ children, style, edgeToEdge = false, debugLabel }: Props) {
  const styles = useStyles(buildStyles);

  if (edgeToEdge) {
    return (
      <View
        style={[styles.flatBody, style]}
        collapsable={false}
        onLayout={debugLabel ? tabSceneLayoutHandler(debugLabel) : undefined}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.surface}>{children}</View>
    </View>
  );
}

function buildStyles() {
  return {
    flatBody: appTabSceneFlatContentStyle(),
    shadow: appContentSheetShadowStyle(),
    surface: appContentSheetSurfaceStyle(),
  };
}
