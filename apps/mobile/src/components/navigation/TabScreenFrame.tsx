import type { ReactNode } from 'react';
import { ScreenFrame } from '@/components/navigation/ScreenFrame';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';

type Props = {
  title: ReactNode;
  /** Action à droite — cloche de notifications par défaut, `null` pour aucune. */
  headerRight?: ReactNode;
  children: ReactNode;
};

/** Écran racine d'onglet — grand titre. */
export function TabScreenFrame({ title, headerRight, children }: Props) {
  return (
    <ScreenFrame
      variant="large"
      title={title}
      right={headerRight !== undefined ? headerRight : <HeaderNotificationBell />}
    >
      {children}
    </ScreenFrame>
  );
}
