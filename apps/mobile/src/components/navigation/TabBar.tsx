import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { fontFamily } from '@/theme/typography';

/** Hauteur contenu standard (proche tab bar iOS ~49pt). */
const TAB_CONTENT_HEIGHT = 48;

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
 * Tab bar compacte : seul `insets.bottom` est appliqué ici (doc React Navigation).
 * Les écrans ne doivent pas ajouter de padding bottom pour la home indicator.
 * Pastilles : intégrées dans `tabBarIcon` (voir TabBarIconBadge).
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          height: TAB_CONTENT_HEIGHT + bottom,
          paddingBottom: bottom,
        },
      ]}
    >
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

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
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TAB_CONTENT_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iconSlot: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
