import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ScenePullRefreshContext } from '@/components/ui/scene-pull-refresh-context';
import { SceneRefreshIndicator } from '@/components/ui/SceneRefreshIndicator';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  LiquidGlassHeaderInsetProvider,
  StackHeaderInsetProvider,
} from '@/components/navigation/liquid-glass-header-inset';
import { LiquidGlassTabHeader } from '@/components/navigation/LiquidGlassTabHeader';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { StackGlassBackButton } from '@/navigation/StackGlassBackButton';
import { useStyles, type Theme } from '@/theme';

type Props = {
  title?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  shellStyle?: StyleProp<ViewStyle>;
  /** Écran affiché comme onglet : le contenu doit dégager la tab bar native. */
  aboveTabBar?: boolean;
};

/** Stack — header glass flottant (même modèle que les onglets) + scroll edge-to-edge. */
export function StackScreenFrame({
  title,
  headerLeft,
  headerRight,
  children,
  shellStyle,
  aboveTabBar = false,
}: Props) {
  const styles = useStyles(buildStyles);
  const [sceneRefreshing, setSceneRefreshing] = useState(false);
  const bindSceneRefresh = useCallback((visible: boolean) => {
    setSceneRefreshing(visible);
  }, []);

  const shell = (
    <TabScreenShell edgeToEdge style={[styles.body, shellStyle]}>
      {children}
    </TabScreenShell>
  );

  return (
    <View style={styles.root} collapsable={false}>
      <ScenePullRefreshContext.Provider value={bindSceneRefresh}>
        {aboveTabBar ? (
          <LiquidGlassHeaderInsetProvider visual="inline">{shell}</LiquidGlassHeaderInsetProvider>
        ) : (
          <StackHeaderInsetProvider>{shell}</StackHeaderInsetProvider>
        )}

        <SceneRefreshIndicator visible={sceneRefreshing} />

        <LiquidGlassTabHeader
          title={title}
          headerLeft={headerLeft === undefined ? <StackGlassBackButton /> : headerLeft}
          headerRight={headerRight}
          visual="inline"
        />
      </ScenePullRefreshContext.Provider>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.background,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
  };
}
