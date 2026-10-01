import type { ReactNode } from 'react';
import { StackScreenFrame } from '@/components/navigation/StackScreenFrame';
import { HeaderTitleText } from '@/navigation/HeaderTitle';
import { useStackHeaderCatalogEntry } from '@/navigation/stack-header-catalog';
import { useStackChromeTabRoot } from '@/navigation/stack-chrome-tab-root';

type Props = {
  children: ReactNode;
  title?: ReactNode;
  headerLeft?: ReactNode | null;
  headerRight?: ReactNode | null;
};

/**
 * Enveloppe stack — titre depuis props (spécifique au rôle), onglet hôte (`StackChromeTabRoot`)
 * ou `STACK_HEADER_CATALOG`. Le header natif est masqué : les `options.title` des `_layout`
 * ne sont pas lisibles ici.
 */
export function StackChromeScreen({ children, title, headerLeft, headerRight }: Props) {
  const catalogEntry = useStackHeaderCatalogEntry();
  const tabRoot = useStackChromeTabRoot();
  const resolved = title ?? tabRoot?.title ?? catalogEntry?.title;

  return (
    <StackScreenFrame
      title={typeof resolved === 'string' ? <HeaderTitleText title={resolved} /> : resolved}
      headerLeft={headerLeft !== undefined ? headerLeft : tabRoot ? null : undefined}
      headerRight={headerRight !== undefined ? headerRight : tabRoot?.headerRight}
      aboveTabBar={tabRoot != null}
    >
      {children}
    </StackScreenFrame>
  );
}
