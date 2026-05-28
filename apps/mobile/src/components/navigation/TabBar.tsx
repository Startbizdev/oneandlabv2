import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '@/theme';
import { fontFamily } from '@/theme/typography';

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
  const label =
    typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : typeof options.title === 'string'
        ? options.title
        : routeName;

  const icon = options.tabBarIcon?.({
    focused: isFocused,
    color: isFocused ? colors.primary : colors.textTertiary,
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
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      style={styles.tabItem}
    >
      <View style={styles.iconSlot}>{icon}</View>
      <Text
        style={[styles.label, isFocused ? styles.labelFocused : styles.labelIdle]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Tab bar — insets bas via `useSafeAreaInsets` (recommandation React Navigation 2026).
 * @see https://reactnavigation.org/docs/handling-safe-area/
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing[1]) }]}>
      <View style={styles.row}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TAB_CONTENT_HEIGHT,
    paddingTop: spacing[1.5],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing[1],
  },
  iconSlot: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[0.5],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  labelFocused: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  labelIdle: {
    color: colors.textTertiary,
  },
});
