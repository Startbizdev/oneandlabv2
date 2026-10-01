import { createContext, useContext, type ReactNode } from 'react';

type StackChromeTabRootValue = {
  title: string;
  headerRight?: ReactNode;
};

const StackChromeTabRootContext = createContext<StackChromeTabRootValue | null>(null);

/**
 * Onglet qui affiche un écran construit sur `StackChromeScreen` :
 * titre d'onglet, pas de bouton retour, insets de la tab bar.
 */
export function StackChromeTabRoot({
  title,
  headerRight,
  children,
}: StackChromeTabRootValue & { children: ReactNode }) {
  return (
    <StackChromeTabRootContext.Provider value={{ title, headerRight }}>
      {children}
    </StackChromeTabRootContext.Provider>
  );
}

export function useStackChromeTabRoot(): StackChromeTabRootValue | null {
  return useContext(StackChromeTabRootContext);
}
