import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { OpaqueHeaderChrome } from '@/components/navigation/OpaqueHeaderChrome';
import {
  APP_HEADER_INNER_BOTTOM,
  APP_HEADER_INNER_H_PADDING,
} from '@/components/navigation/header-layout';
import {
  LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT,
  LIQUID_GLASS_LARGE_TITLE_ROW_MIN_HEIGHT,
  type LiquidGlassHeaderVisual,
} from '@/components/navigation/nav-chrome-tokens';
import { layoutRowCenter } from '@/theme/layout-styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabSceneLayoutHandler } from '@/lib/debug/tab-scene-layout-debug';

type Props = {
  title?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  visual?: LiquidGlassHeaderVisual;
  style?: StyleProp<ViewStyle>;
  /** __DEV__ — logs layout Metro. */
  debugLabel?: string;
};

/** Header onglets flottant — fond blanc opaque, orbes glass sur les actions. */
export function LiquidGlassTabHeader({
  title,
  headerLeft,
  headerRight,
  visual = 'inline',
  style,
  debugLabel,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'LiquidGlassTabHeader');
  const insets = useSafeAreaInsets();
  const padH = APP_HEADER_INNER_H_PADDING;
  const rowMinHeight =
    visual === 'large' ? LIQUID_GLASS_LARGE_TITLE_ROW_MIN_HEIGHT : LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT;

  return (
    <View
      style={[styles.root, style]}
      pointerEvents="box-none"
      onLayout={debugLabel ? tabSceneLayoutHandler(debugLabel) : undefined}
    >
      <OpaqueHeaderChrome style={StyleSheet.absoluteFillObject as StyleProp<ViewStyle>} />

      <View
        pointerEvents="box-none"
        style={{
          paddingTop: insets.top,
          paddingBottom: APP_HEADER_INNER_BOTTOM,
          paddingLeft: insets.left + padH,
          paddingRight: insets.right + padH,
        }}
      >
        <Row align="center" justify="between" gap={8} style={[styles.row, { minHeight: rowMinHeight }]}>
          <View style={styles.leading}>
            {headerLeft ? <View style={styles.leadingSlot}>{headerLeft}</View> : null}
            {title ? <View style={styles.titleSlot}>{title}</View> : null}
          </View>
          {headerRight ? <View style={styles.trailing}>{headerRight}</View> : null}
        </Row>
      </View>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    root: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      backgroundColor: 'transparent',
    },
    row: {
      minHeight: LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT,
      overflow: 'visible' as const,
    },
    leading: {
      flex: 1,
      ...layoutRowCenter(8),
      minWidth: 0,
    },
    leadingSlot: {
      flexShrink: 0,
    },
    titleSlot: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
    },
    trailing: {
      flexShrink: 0,
      marginLeft: 4,
      overflow: 'visible' as const,
    },
  };
}
