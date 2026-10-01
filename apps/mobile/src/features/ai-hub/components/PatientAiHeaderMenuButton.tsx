import { History } from 'lucide-react-native';
import { HeaderAction } from '@/components/navigation/HeaderAction';

interface Props {
  onPress: () => void;
}

/** Historique des conversations Cary. */
export function PatientAiHeaderMenuButton({ onPress }: Props) {
  return <HeaderAction icon={History} accessibilityLabel="Historique des conversations" onPress={onPress} />;
}
