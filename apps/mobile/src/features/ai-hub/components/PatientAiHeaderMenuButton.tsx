import { iconSize } from '@/theme';
import { List } from 'lucide-react-native';
import { GlassHeaderButton } from '@/components/navigation/GlassHeaderButton';

interface Props {
  onPress: () => void;
}

/** Historique conversations Cary — bouton glass iOS 26. */
export function PatientAiHeaderMenuButton({ onPress }: Props) {
  return (
    <GlassHeaderButton
      symbol="clock.arrow.circlepath"
      accessibilityLabel="Historique des conversations"
      onPress={onPress}
      fallback={<List size={iconSize.md} strokeWidth={2.25} />}
    />
  );
}
