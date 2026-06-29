import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { HeaderGreeting } from '@/navigation/HeaderGreeting';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';
import { HeaderTitleText } from '@/navigation/HeaderTitle';

export function AppointmentsTabScreenFrame({
  children,
  headerRight,
}: {
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <TabScreenFrame
      title={<HeaderGreeting />}
      headerVisual="inline"
      headerRight={headerRight !== undefined ? headerRight : <HeaderNotificationBell />}
      debugLabel="nurse-appointments-tab"
    >
      {children}
    </TabScreenFrame>
  );
}

export function TitledTabScreenFrame({
  title,
  symbol,
  fallbackIcon,
  headerRight,
  children,
  shellStyle,
  floatingAction,
}: {
  title: string;
  symbol: SFSymbol;
  fallbackIcon?: LucideIcon;
  headerRight?: ReactNode;
  children: ReactNode;
  shellStyle?: object;
  floatingAction?: ReactNode;
}) {
  return (
    <TabScreenFrame
      title={<HeaderTitleText title={title} />}
      headerVisual="inline"
      headerRight={headerRight !== undefined ? headerRight : <HeaderNotificationBell />}
      shellStyle={shellStyle}
      floatingAction={floatingAction}
    >
      {children}
    </TabScreenFrame>
  );
}
