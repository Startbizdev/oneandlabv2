import { MessageCircle } from 'lucide-react-native';
import { ActionRowCard } from '@/components/ui/ActionRowCard';
import { useAppColors } from '@/theme/use-app-colors';
import type { CareExchangeHintContent } from '../../utils/care-photo-copy';

interface Props {
  hint: CareExchangeHintContent;
  onPress: () => void;
}

export function CareExchangeHintBanner({ hint, onPress }: Props) {
  const c = useAppColors();
  return (
    <ActionRowCard
      title={hint.title}
      body={hint.body}
      Icon={MessageCircle}
      iconColor={c.primaryDark}
      iconBg={c.primaryLight}
      highlighted
      onPress={onPress}
      accessibilityHint="Ouvre l’échange"
    />
  );
}
