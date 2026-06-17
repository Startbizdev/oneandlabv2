import {
  createContext,
  useContext,
  useEffect,
  type DependencyList,
  type ReactNode,
} from 'react';

type OverlaySetter = (node: ReactNode | null) => void;

export const TabScreenOverlayContext = createContext<OverlaySetter | null>(null);

/** FAB / overlay flottant au-dessus du contenu et de la tab bar (rendu dans TabScreenFrame). */
export function useTabScreenOverlay(render: () => ReactNode, deps: DependencyList) {
  const setOverlay = useContext(TabScreenOverlayContext);
  useEffect(() => {
    if (!setOverlay) return undefined;
    setOverlay(render());
    return () => setOverlay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aligné sur deps passées par l'appelant
  }, [setOverlay, ...deps]);
}
