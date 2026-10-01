import type { ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useNavigation } from 'expo-router';
import { StackScreenFrame } from '@/components/navigation/StackScreenFrame';
import { useAppColors } from '@/theme/use-app-colors';
import {
  resolveStackHeaderSide,
  resolveStackHeaderTitle,
} from '@/navigation/resolve-stack-header-node';
import {
  stackHeaderTitleNode,
  useStackHeaderCatalogEntry,
} from '@/navigation/stack-header-catalog';
import { useStackChromeTabRoot } from '@/navigation/stack-chrome-tab-root';

type Props = {
  children: ReactNode;
  title?: ReactNode;
  headerLeft?: ReactNode | null;
  headerRight?: ReactNode | null;
};

/**
 * Enveloppe stack — titre depuis props, onglet hôte (`StackChromeTabRoot`), catalogue route
 * ou options dynamiques.
 */
export function StackChromeScreen({ children, title, headerLeft, headerRight }: Props) {
  const c = useAppColors();
  const navigation = useNavigation();
  const catalogEntry = useStackHeaderCatalogEntry();
  const tabRoot = useStackChromeTabRoot();
  const [dynamicOptions, setDynamicOptions] = useState<NativeStackNavigationOptions>({});

  useLayoutEffect(() => {
    const update = () => {
      const getter = (navigation as { getCurrentOptions?: () => object }).getCurrentOptions;
      const opts = getter?.();
      if (opts && typeof opts === 'object') {
        setDynamicOptions(opts as NativeStackNavigationOptions);
      }
    };
    update();
    const unsubFocus = navigation.addListener('focus', update);
    const unsubOptions = navigation.addListener('options' as never, update);
    return () => {
      unsubFocus();
      unsubOptions();
    };
  }, [navigation]);

  const options = dynamicOptions;
  const tintColor = options.headerTintColor ?? c.primary;
  const sideProps = { tintColor, canGoBack: true, label: '' };
  const routeTitle = tabRoot
    ? stackHeaderTitleNode({ title: tabRoot.title })
    : catalogEntry
      ? stackHeaderTitleNode(catalogEntry)
      : undefined;

  const resolvedTitle = resolveStackHeaderTitle(
    title ?? routeTitle ?? options.headerTitle ?? options.title,
    tintColor,
  );

  const resolvedLeft =
    headerLeft !== undefined
      ? headerLeft
      : tabRoot
        ? null
        : resolveStackHeaderSide(options.headerLeft, sideProps);

  const resolvedRight =
    headerRight !== undefined
      ? headerRight
      : tabRoot?.headerRight ?? resolveStackHeaderSide(options.headerRight, sideProps);

  return (
    <StackScreenFrame
      title={resolvedTitle}
      headerLeft={resolvedLeft}
      headerRight={resolvedRight}
      aboveTabBar={tabRoot != null}
    >
      {children}
    </StackScreenFrame>
  );
}
