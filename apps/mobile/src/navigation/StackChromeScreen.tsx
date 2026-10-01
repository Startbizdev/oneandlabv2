import type { ReactNode } from 'react';
import { ScreenFrame } from '@/components/navigation/ScreenFrame';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { useStackHeaderCatalogEntry } from '@/navigation/stack-header-catalog';
import { useStackChromeTabRoot } from '@/navigation/stack-chrome-tab-root';

type Props = {
  children: ReactNode;
  title?: ReactNode;
  /** Retour par défaut ; `null` pour le masquer, ou un retour à comportement propre. */
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
};

/**
 * Écran de pile — titre depuis props (spécifique au rôle), onglet hôte (`StackChromeTabRoot`)
 * ou `STACK_HEADER_CATALOG`. Le header natif est masqué : les `options.title` des `_layout`
 * ne sont pas lisibles ici.
 */
export function StackChromeScreen({ children, title, headerLeft, headerRight }: Props) {
  const catalogEntry = useStackHeaderCatalogEntry();
  const tabRoot = useStackChromeTabRoot();
  const resolvedTitle = title ?? tabRoot?.title ?? catalogEntry?.title;

  if (tabRoot) {
    return (
      <ScreenFrame
        variant="large"
        title={resolvedTitle}
        right={headerRight !== undefined ? headerRight : tabRoot.headerRight}
      >
        {children}
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      variant="compact"
      title={resolvedTitle}
      left={headerLeft !== undefined ? headerLeft : <HeaderBackButton />}
      right={headerRight}
    >
      {children}
    </ScreenFrame>
  );
}
