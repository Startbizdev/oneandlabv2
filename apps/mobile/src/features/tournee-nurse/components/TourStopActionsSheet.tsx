import { CalendarClock, UserCheck, UserX } from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import {
  DetailActionList,
  type DetailActionItem,
} from '@/features/appointments/detail/components/layout/DetailActionList';
import { useAfterSheetDismiss } from '@/components/ui/sheet/use-after-sheet-dismiss';
import type { NurseTourStop } from '../api/nurse-tour.service';
import { tourStopActionAvailability } from '../utils/tour-stop-action-availability';

type Props = {
  visible: boolean;
  /** Dernier passage ouvert, conservé pendant la fermeture. */
  stop: NurseTourStop | null;
  liftingAbsence: boolean;
  onClose: () => void;
  onReschedule: (stop: NurseTourStop) => void;
  onManageAbsence: (stop: NurseTourStop) => void;
  onLiftAbsence: (stop: NurseTourStop) => void;
};

/** Actions d'un passage de tournée, même feuille sur iOS et Android. */
export function TourStopActionsSheet({
  visible,
  stop,
  liftingAbsence,
  onClose,
  onReschedule,
  onManageAbsence,
  onLiftAbsence,
}: Props) {
  const { closeThen, onDismissed } = useAfterSheetDismiss(onClose);
  const actions: DetailActionItem[] = [];
  if (stop) {
    const available = tourStopActionAvailability(stop);
    if (available.reschedule) {
      actions.push({
        key: 'reschedule',
        label: 'Changer le créneau',
        icon: CalendarClock,
        tone: 'neutral',
        showChevron: false,
        onPress: () => closeThen(() => onReschedule(stop)),
      });
    }
    if (available.manageAbsence) {
      actions.push({
        key: 'absence',
        label: available.liftAbsence ? 'Modifier l’absence' : 'Déclarer une absence',
        icon: UserX,
        tone: 'neutral',
        showChevron: false,
        onPress: () => closeThen(() => onManageAbsence(stop)),
      });
    }
    if (available.liftAbsence) {
      actions.push({
        key: 'lift_absence',
        label: 'Patient de retour',
        icon: UserCheck,
        tone: 'destructive',
        loading: liftingAbsence,
        showChevron: false,
        onPress: () => onLiftAbsence(stop),
      });
    }
  }

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={stop?.patient_name ?? ''}
      dismissible={!liftingAbsence}
    >
      <DetailActionList actions={actions} />
    </SheetModal>
  );
}
