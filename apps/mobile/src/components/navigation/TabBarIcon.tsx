import type { LucideIcon } from 'lucide-react-native';

interface Props {
  Icon: LucideIcon;
  color: string;
  size?: number;
}

export function TabBarIcon({ Icon, color, size = 22 }: Props) {
  return <Icon color={color} size={size} strokeWidth={2} />;
}
