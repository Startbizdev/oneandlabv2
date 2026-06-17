import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ScenePullRefreshContext } from '@/components/ui/scene-pull-refresh-context';
import { SceneRefreshIndicator } from '@/components/ui/SceneRefreshIndicator';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StackHeaderInsetProvider } from '@/components/navigation/liquid-glass-header-inset';
import { LiquidGlassTabHeader } from '@/components/navigation/LiquidGlassTabHeader';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { StackGlassBackButton } from '@/navigation/StackGlassBackButton';

type Props = {
  title?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  shellStyle?: StyleProp<ViewStyle>;
};

/** Stack — header glass flottant (même modèle que les onglets) + scroll edge-to-edge. */
export function StackScreenFrame({
  title,
  headerLeft,
  headerRight,
  children,
  shellStyle,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'StackScreenFrame');
  const [sceneRefreshing, setSceneRefreshing] = useState(false);
  const bindSceneRefresh = useCallback((visible: boolean) => {
    setSceneRefreshing(visible);
  }, []);

  return (
    <View style={styles.root}>
      <ScenePullRefreshContext.Provider value={bindSceneRefresh}>
        <StackHeaderInsetProvider>
          <TabScreenShell edgeToEdge style={[styles.body, shellStyle]}>
            {children}
          </TabScreenShell>
        </StackHeaderInsetProvider>

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
  };
}
