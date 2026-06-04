import { MessageCircle } from 'lucide-react-native';
import { ActionRowCard } from '@/components/ui/ActionRowCard';
import { colors } from '@/theme';
import type { CareExchangeHintContent } from '../../utils/care-photo-copy';

interface Props {
  hint: CareExchangeHintContent;
  onPress: () => void;
}

export function CareExchangeHintBanner({ hint, onPress }: Props) {
  return (
    <ActionRowCard
      title={hint.title}
      body={hint.body}
      Icon={MessageCircle}
      iconColor={colors.primaryDark}
      iconBg={colors.primaryLight}
      highlighted
      onPress={onPress}
      accessibilityHint="Ouvre l’onglet Échange"
    />
  );
}
