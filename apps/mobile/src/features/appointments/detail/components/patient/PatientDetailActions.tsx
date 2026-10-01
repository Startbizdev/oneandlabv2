import { useMemo } from 'react';
import { XCircle } from 'lucide-react-native';
import { DetailActionList, type DetailActionItem } from '../layout/DetailActionList';

interface Props {
  canceled: boolean;
  cancelCount: number;
  onCancel: () => void;
}

/** Action destructive gardée dans le contenu, hors de la barre fixe. */
export function PatientDetailActions({ canceled, cancelCount, onCancel }: Props) {
  const actions = useMemo((): DetailActionItem[] => {
    if (canceled || cancelCount <= 0) return [];
    return [
      {
        key: 'cancel',
        label:
          cancelCount > 1 ? 'Annuler les rendez-vous du lot' : 'Annuler le rendez-vous',
        hint: 'Action irréversible',
        icon: XCircle,
        tone: 'destructive',
        onPress: onCancel,
        showChevron: false,
      },
    ];
  }, [cancelCount, canceled, onCancel]);

  return <DetailActionList actions={actions} />;
}
