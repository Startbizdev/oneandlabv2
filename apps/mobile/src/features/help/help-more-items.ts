import { HelpCircle, LifeBuoy } from 'lucide-react-native';
import type { MoreMenuItemProps } from '@/features/profile/components/MoreMenuItem';

export function buildHelpMoreItems(nav: (href: string) => void): MoreMenuItemProps[] {
  return [
    {
      icon: HelpCircle,
      label: "Centre d'aide",
      onPress: () => nav('/profile/help'),
      iconAccent: 'teal',
    },
    {
      icon: LifeBuoy,
      label: 'Contacter le support',
      onPress: () => nav('/profile/support'),
      iconAccent: 'teal',
    },
  ];
}
