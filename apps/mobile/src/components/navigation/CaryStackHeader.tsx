import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { getDefaultHeaderHeight, getHeaderTitle } from '@react-navigation/elements';
import { Platform, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaryHeaderBackground } from '@/components/navigation/CaryHeaderBackground';
import {
  APP_HEADER_BACK_TITLE_GAP,
  APP_HEADER_INNER_BOTTOM,
  APP_HEADER_INNER_H_PADDING,
} from '@/components/navigation/header-layout';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';

import { fontFamily, fontSize } from '@/theme/typography';

const STATUS_BAR_OFFSET = Platform.select({ ios: -7, default: 0 });

/**
 * Header stack Cary — layout pleine largeur pour le titre (pas de coupure à 50 %).
 */
export function CaryStackHeader({ options, route, back, navigation }: NativeStackHeaderProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_navigation_CaryStackHeader_tsx_CaryStackHeader_styles');

  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const innerBottom = APP_HEADER_INNER_BOTTOM;
  const headerHeight = getDefaultHeaderHeight(layout, false, insets.top) + innerBottom;
  const statusBarSpacing = Math.max(insets.top + (STATUS_BAR_OFFSET ?? 0), 0);

  const titleText = getHeaderTitle(options, route.name);
  const tintColor = options.headerTintColor ?? c.primary;

  const headerLeftNode =
    options.headerLeft !== undefined
      ? options.headerLeft({
          tintColor,
          canGoBack: Boolean(back),
          label: back?.title,
        })
      : back
        ? <HeaderBackButton onPress={() => navigation.goBack()} />
        : null;

  const headerTitleNode =
    typeof options.headerTitle === 'function'
      ? options.headerTitle({
          children: titleText,
          tintColor,
        })
      : (options.headerTitle ?? titleText);

  const headerRightNode = options.headerRight
    ? options.headerRight({
        tintColor,
        canGoBack: Boolean(back),
      })
    : null;

  const titleIsString = typeof headerTitleNode === 'string';
  const padH = APP_HEADER_INNER_H_PADDING;
  const padLeft = insets.left + padH;
  const padRight = insets.right + padH;

  return (
    <View style={[styles.root, { height: headerHeight }]}>
      <CaryHeaderBackground style={StyleSheet.absoluteFillObject as StyleProp<ViewStyle>} />
      <View style={[styles.content, { marginTop: statusBarSpacing, paddingBottom: innerBottom }]}>
        <Row align="center" gap={APP_HEADER_BACK_TITLE_GAP} style={[styles.row, { paddingRight: padRight }]}>
          {headerLeftNode ? (
            <View style={[styles.side, { paddingLeft: padLeft }]}>{headerLeftNode}</View>
          ) : null}

          <View style={[styles.titleSlot, !headerLeftNode && { paddingLeft: padLeft }]}>
            {titleIsString ? (
              <Text
                style={[styles.titleText, options.headerTitleStyle]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {headerTitleNode}
              </Text>
            ) : (
              headerTitleNode
            )}
          </View>

          {headerRightNode ? <View style={styles.side}>{headerRightNode}</View> : null}
        </Row>
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    width: '100%' as const,
    backgroundColor: 'transparent',
  },
  content: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center' as const,
  },
  row: {
    minHeight: 44,
  },
  side: {
    flexShrink: 0,
  },
  titleSlot: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const,
  },
  titleText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
};
}
