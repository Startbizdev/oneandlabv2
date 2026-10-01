import { LocateFixed } from 'lucide-react-native';
import { HeaderAction } from '@/components/navigation/HeaderAction';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

/** Action header — actualiser la position GPS pour l'optimisation. */
export function TourLocateAction({ onPress, loading }: Props) {
  return (
    <HeaderAction
      icon={LocateFixed}
      accessibilityLabel="Actualiser ma position"
      onPress={onPress}
      loading={loading}
    />
  );
}
