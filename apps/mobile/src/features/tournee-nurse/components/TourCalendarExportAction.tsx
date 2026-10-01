import { CalendarPlus } from 'lucide-react-native';
import { HeaderAction } from '@/components/navigation/HeaderAction';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

/** Ajoute la tournée du jour au calendrier du téléphone. */
export function TourCalendarExportAction({ onPress, loading }: Props) {
  return (
    <HeaderAction
      icon={CalendarPlus}
      accessibilityLabel="Ajouter la tournée au calendrier"
      onPress={onPress}
      loading={loading}
    />
  );
}
