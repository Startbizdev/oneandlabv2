import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Props communes stack natif + onglets (sans dépendre du chrome natif). */
export type AppHeaderProps = Pick<
  NativeStackHeaderProps,
  'navigation' | 'options' | 'route' | 'back'
>;

/** Hauteur zone titre / actions (hors safe area). */
export const APP_HEADER_CONTENT_HEIGHT = 48;

const TINT = colors.primary;

function renderTitle(options: AppHeaderProps['options'], route: AppHeaderProps['route']): ReactNode {
  const { headerTitle, title } = options;

  if (typeof headerTitle === 'function') {
    return headerTitle({ children: title ?? route.name, tintColor: TINT });
  }

  const text = headerTitle ?? title;
  if (text == null || text === '') return null;

  return (
    <Text style={styles.defaultTitle} numberOfLines={1}>
      {String(text)}
    </Text>
  );
}

/**
 * Header 100 % React (View / Text / Pressable) — remplace UINavigationBar / Material toolbar.
 * Branché via `header: AppHeader` dans stackHeaderOptions / tabScreenOptions.
 */
export function AppHeader({ navigation, options, route }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  const canGoBack = navigation.canGoBack();
  const headerLeft = options.headerLeft?.({ tintColor: TINT, canGoBack });
  const headerRight = options.headerRight?.({ tintColor: TINT, canGoBack });

  const showDefaultBack = canGoBack && options.headerBackVisible !== false;
  const hasLeft = !!(headerLeft || showDefaultBack);
  const hasRight = !!headerRight;

  const left = headerLeft ?? (
    showDefaultBack ? <HeaderBackButton onPress={() => navigation.goBack()} /> : null
  );

  const title = renderTitle(options, route);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={[styles.bar, { minHeight: APP_HEADER_CONTENT_HEIGHT }]}>
        {hasLeft ? <View style={styles.left}>{left}</View> : null}
        <View
          style={[
            styles.center,
            !hasLeft && styles.centerNoLeft,
            !hasRight && styles.centerNoRight,
          ]}
        >
          {title}
        </View>
        {hasRight ? <View style={styles.right}>{headerRight}</View> : null}
      </View>
    </View>
  );
}

/** Hauteur totale header (safe area + barre). */
export function useAppHeaderHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + APP_HEADER_CONTENT_HEIGHT;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flexShrink: 0,
    justifyContent: 'center',
    maxWidth: '46%',
  },
  center: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  /** Onglets racine sans bouton gauche — titre aligné au contenu. */
  centerNoLeft: {
    paddingLeft: spacing[4],
  },
  centerNoRight: {
    paddingRight: spacing[4],
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: '54%',
  },
  defaultTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
});
