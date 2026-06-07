import { useMemo } from 'react';
import { XCircle } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { DetailActionList, type DetailActionItem } from '../layout/DetailActionList';

interface Props {
  batch: Appointment[];
  canceled: boolean;
  cancelCount: number;
  onCancel: () => void;
  edgeToEdge?: boolean;
}

export function PatientDetailActions({
  batch: _batch,
  canceled,
  cancelCount,
  onCancel,
  edgeToEdge = true,
}: Props) {
  const actions = useMemo((): DetailActionItem[] => {
    const items: DetailActionItem[] = [];

    if (!canceled && cancelCount > 0) {
      items.push({
        key: 'cancel',
        label:
          cancelCount > 1 ? 'Annuler les rendez-vous du lot' : 'Annuler le rendez-vous',
        hint: 'Action irréversible',
        icon: XCircle,
        tone: 'destructive',
        onPress: onCancel,
        showChevron: false,
      });
    }

    return items;
  }, [cancelCount, canceled, onCancel]);

  return <DetailActionList actions={actions} edgeToEdge={edgeToEdge} />;
}
