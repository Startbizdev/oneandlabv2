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

type Props = {
  children: ReactNode;
  title?: ReactNode;
  headerLeft?: ReactNode | null;
  headerRight?: ReactNode | null;
};

/**
 * Enveloppe stack — titre depuis props, catalogue route ou options dynamiques.
 */
export function StackChromeScreen({ children, title, headerLeft, headerRight }: Props) {
  const c = useAppColors();
  const navigation = useNavigation();
  const catalogEntry = useStackHeaderCatalogEntry();
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
  const catalogTitle = catalogEntry ? stackHeaderTitleNode(catalogEntry) : undefined;

  const resolvedTitle = resolveStackHeaderTitle(
    title ?? catalogTitle ?? options.headerTitle ?? options.title,
    tintColor,
  );

  const resolvedLeft =
    headerLeft !== undefined
      ? headerLeft
      : resolveStackHeaderSide(options.headerLeft, sideProps);

  const resolvedRight =
    headerRight !== undefined
      ? headerRight
      : resolveStackHeaderSide(options.headerRight, sideProps);

  return (
    <StackScreenFrame
      title={resolvedTitle}
      headerLeft={resolvedLeft}
      headerRight={resolvedRight}
    >
      {children}
    </StackScreenFrame>
  );
}
