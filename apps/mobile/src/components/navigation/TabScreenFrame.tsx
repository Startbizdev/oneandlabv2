import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  LiquidGlassHeaderInsetProvider,
  type LiquidGlassHeaderVisual,
} from '@/components/navigation/liquid-glass-header-inset';
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
}: Props) {
  const styles = useThemedStyles(buildStyles, 'TabScreenFrame');
  const visual: LiquidGlassHeaderVisual =
    headerVisual ?? (headerLeft ? 'large' : 'inline');

  return (
    <View style={styles.root}>
      <LiquidGlassHeaderInsetProvider visual={visual}>
        <TabScreenShell edgeToEdge={edgeToEdge} style={[styles.body, shellStyle]}>
          {children}
        </TabScreenShell>
      </LiquidGlassHeaderInsetProvider>

      <LiquidGlassTabHeader
        title={title}
        headerLeft={headerLeft}
        headerRight={headerRight}
        visual={visual}
      />
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
