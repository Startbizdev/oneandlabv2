import { useContext } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CountBadge, formatCountBadge } from '@/components/navigation/CountBadge';
import type { RoleTab } from '@/navigation/role-tabs';
import { AppText, font, iconSize, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const ICON_STROKE = 1.75;
const ICON_STROKE_ACTIVE = 2.25;
const TAB_MIN_HEIGHT = 52;

type Props = BottomTabBarProps & {
  tabs: readonly RoleTab[];
  badges: Partial<Record<string, number>>;
};

/** Barre d'onglets Cary — fond blanc, hairline haute, icônes Lucide, safe area basse. */
export function AppTabBar({ state, navigation, tabs, badges }: Props) {
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const tabsByName = new Map(tabs.map((tab) => [tab.name, tab]));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}
    >
      {state.routes.map((route, index) => {
        const tab = tabsByName.get(route.name);
        if (!tab) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (focused || event.defaultPrevented) return;
          void Haptics.selectionAsync();
          navigation.navigate(route.name, route.params);
        };

        return (
          <TabButton
            key={route.key}
            tab={tab}
            focused={focused}
            badge={tab.hasBadge ? formatCountBadge(badges[tab.name]) : undefined}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  tab,
  focused,
  badge,
  onPress,
  onLongPress,
}: {
  tab: RoleTab;
  focused: boolean;
  badge: string | undefined;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const Icon = tab.icon;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${tab.label}, ${badge} en attente` : tab.label}
      testID={`tab-${tab.name}`}
      style={styles.tab}
    >
      <View style={styles.iconSlot}>
        <Icon
          size={iconSize.lg}
          color={focused ? c.primary : c.textSecondary}
          strokeWidth={focused ? ICON_STROKE_ACTIVE : ICON_STROKE}
        />
        {badge ? <CountBadge label={badge} /> : null}
      </View>
      <AppText
        style={[styles.label, focused && styles.labelActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        compact
      >
        {tab.label}
      </AppText>
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    bar: {
      flexDirection: 'row' as const,
      width: '100%' as const,
      paddingTop: spacing[1.5],
      paddingHorizontal: spacing[1],
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    tab: {
      flex: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: TAB_MIN_HEIGHT,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1],
      paddingHorizontal: spacing[0.5],
    },
    iconSlot: {
      width: iconSize.lg,
      height: iconSize.lg,
    },
    label: {
      ...font.medium,
      fontSize: fontSize['2xs'],
      lineHeight: Math.round(fontSize['2xs'] * 1.25),
      color: c.textSecondary,
      textAlign: 'center' as const,
      alignSelf: 'stretch' as const,
    },
    labelActive: {
      ...font.semiBold,
      color: c.primaryDark,
    },
  };
}
