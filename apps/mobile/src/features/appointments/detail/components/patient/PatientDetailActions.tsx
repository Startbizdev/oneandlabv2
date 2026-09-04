import { useMemo } from 'react';
import { CalendarClock, XCircle } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { DetailActionList, type DetailActionItem } from '../layout/DetailActionList';

interface Props {
  batch: Appointment[];
  canceled: boolean;
  cancelCount: number;
  canEditSchedule?: boolean;
  onEditSchedule?: () => void;
  onCancel: () => void;
  edgeToEdge?: boolean;
}

export function PatientDetailActions({
  batch: _batch,
  canceled,
  cancelCount,
  canEditSchedule = false,
  onEditSchedule,
  onCancel,
  edgeToEdge = true,
}: Props) {
  const actions = useMemo((): DetailActionItem[] => {
    const items: DetailActionItem[] = [];

    if (!canceled && canEditSchedule && onEditSchedule) {
      items.push({
        key: 'edit-schedule',
        label: 'Modifier date et créneau',
        hint: 'Tant que le rendez-vous est en attente',
        icon: CalendarClock,
        tone: 'primary',
        onPress: onEditSchedule,
      });
    }

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
  }, [cancelCount, canceled, canEditSchedule, onCancel, onEditSchedule]);

  return <DetailActionList actions={actions} edgeToEdge={edgeToEdge} />;
}
