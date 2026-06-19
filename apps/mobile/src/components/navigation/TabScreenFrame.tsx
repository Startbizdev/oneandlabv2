import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ScenePullRefreshContext } from '@/components/ui/scene-pull-refresh-context';
import { SceneRefreshIndicator } from '@/components/ui/SceneRefreshIndicator';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  LiquidGlassHeaderInsetProvider,
} from '@/components/navigation/liquid-glass-header-inset';
import type { LiquidGlassHeaderVisual } from '@/components/navigation/nav-chrome-tokens';
import { LiquidGlassTabHeader } from '@/components/navigation/LiquidGlassTabHeader';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';

type Props = {
  title?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  headerVisual?: LiquidGlassHeaderVisual;
  children: ReactNode;
  shellStyle?: StyleProp<ViewStyle>;
  edgeToEdge?: boolean;
  /** FAB ou overlay flottant (rendu au-dessus du contenu, sous le header). */
  floatingAction?: ReactNode;
};

/** Écran d’onglet — header glass flottant iOS 26 + corps plat edge-to-edge. */
export function TabScreenFrame({
  title,
  headerLeft,
  headerRight,
  headerVisual,
  children,
  shellStyle,
  edgeToEdge = true,
  floatingAction,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'TabScreenFrame');
  const visual: LiquidGlassHeaderVisual =
    headerVisual ?? (headerLeft ? 'large' : 'inline');
  const [sceneRefreshing, setSceneRefreshing] = useState(false);
  const bindSceneRefresh = useCallback((visible: boolean) => {
    setSceneRefreshing(visible);
  }, []);

  return (
    <View style={styles.root} collapsable={false}>
      <ScenePullRefreshContext.Provider value={bindSceneRefresh}>
        <LiquidGlassHeaderInsetProvider visual={visual}>
          <TabScreenShell edgeToEdge={edgeToEdge} style={[styles.body, shellStyle]}>
            {children}
          </TabScreenShell>

          {floatingAction ? (
            <View style={styles.floatingSlot} pointerEvents="box-none">
              {floatingAction}
            </View>
          ) : null}
        </LiquidGlassHeaderInsetProvider>

        <SceneRefreshIndicator visible={sceneRefreshing} />

        <LiquidGlassTabHeader
          title={title}
          headerLeft={headerLeft}
          headerRight={headerRight}
          visual={visual}
        />
      </ScenePullRefreshContext.Provider>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.surface,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    floatingSlot: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
      elevation: 40,
    },
  };
}
