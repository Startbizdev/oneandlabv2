import { getDefaultHeaderHeight, getHeaderTitle } from '@react-navigation/elements';
import { Platform, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaryHeaderBackground } from '@/components/navigation/CaryHeaderBackground';
import {
  APP_HEADER_BACK_TITLE_GAP,
  APP_HEADER_INNER_BOTTOM,
  APP_HEADER_INNER_H_PADDING,
} from '@/components/navigation/header-layout';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { colors } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const STATUS_BAR_OFFSET = Platform.select({ ios: -7, default: 0 });

/**
 * Header stack Cary — layout pleine largeur pour le titre (pas de coupure à 50 %).
 */
export function CaryStackHeader({ options, route, back, navigation }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const innerBottom = APP_HEADER_INNER_BOTTOM;
  const headerHeight = getDefaultHeaderHeight(layout, false, insets.top) + innerBottom;
  const statusBarSpacing = Math.max(insets.top + (STATUS_BAR_OFFSET ?? 0), 0);

  const titleText = getHeaderTitle(options, route.name);
  const tintColor = options.headerTintColor ?? colors.primary;

  const headerLeftNode =
    options.headerLeft !== undefined
      ? options.headerLeft({
          tintColor,
          canGoBack: Boolean(back),
          onPress: back ? () => navigation.goBack() : undefined,
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
          style: options.headerTitleStyle,
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
        <View style={[styles.row, { paddingRight: padRight }]}>
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: APP_HEADER_BACK_TITLE_GAP,
    minHeight: 44,
  },
  side: {
    flexShrink: 0,
  },
  titleSlot: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
});
