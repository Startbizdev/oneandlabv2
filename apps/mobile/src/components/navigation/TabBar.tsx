import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Hauteur zone icône + libellé (hors safe area bas). */
const TAB_CONTENT_HEIGHT = 50;

function isTabVisible(options: BottomTabNavigationOptions): boolean {
  if (options.tabBarButton === null) return false;
  return options.tabBarIcon != null;
}

function TabItem({
  isFocused,
  onPress,
  onLongPress,
  options,
  routeName,
}: {
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  options: BottomTabBarProps['descriptors'][string]['options'];
  routeName: string;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'TabBar.TabItem');
  const label =
    typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : typeof options.title === 'string'
        ? options.title
        : routeName;

  const icon = options.tabBarIcon?.({
    focused: isFocused,
    color: isFocused ? c.primary : c.textTertiary,
    size: 22,
  });

  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
      testID={options.tabBarButtonTestID}
      style={styles.tabItem}
    >
      <View style={styles.iconSlot}>{icon}</View>
      <AppText
        style={[styles.label, isFocused ? styles.labelFocused : styles.labelIdle]}
        numberOfLines={1}
        compact
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Tab bar — insets bas via `useSafeAreaInsets` (recommandation React Navigation 2026).
 * @see https://reactnavigation.org/docs/handling-safe-area/
 */
export function TabBar({
  state, descriptors, navigation }: BottomTabBarProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_navigation_TabBar_tsx_styles');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing[1]) }]}>
      <Row align="center" style={styles.row}>
        {state.routes.map((route, routeIndex) => {
          const { options } = descriptors[route.key];
          if (!isTabVisible(options)) return null;

          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              options={options}
            />
          );
        })}
      </Row>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: {
    backgroundColor: c.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  row: {
    minHeight: TAB_CONTENT_HEIGHT,
    paddingTop: spacing[1.5],
  },
  tabItem: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingBottom: spacing[1],
  },
  iconSlot: {
    height: 26,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing[0.5],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    letterSpacing: 0.1,
  },
  labelFocused: {
    color: c.primary,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  labelIdle: {
    color: c.textTertiary,
  },
};
}

