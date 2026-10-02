import { useState } from 'react';
import { CalendarPlus, Trash2, UserRound } from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { useAfterSheetDismiss } from '@/components/ui/sheet/use-after-sheet-dismiss';
import {
  DetailActionList,
  type DetailActionItem,
} from '@/features/appointments/detail/components/layout/DetailActionList';

export type StaffPatientActionTarget = {
  patientId: string;
  name: string;
  canDelete: boolean;
};

type Props = {
  target: StaffPatientActionTarget | null;
  onClose: () => void;
  onOpenProfile: (target: StaffPatientActionTarget) => void;
  onCreateAppointment: (target: StaffPatientActionTarget) => void;
  onDelete: (target: StaffPatientActionTarget) => void;
};

/** Actions d'un patient du hub (appui long), même feuille sur iOS et Android. */
export function StaffPatientActionsSheet({
  target,
  onClose,
  onOpenProfile,
  onCreateAppointment,
  onDelete,
}: Props) {
  /** Dernier patient ciblé : la sheet reste montée pendant sa fermeture pour lancer l'action ensuite. */
  const [shown, setShown] = useState(target);
  if (target && target !== shown) setShown(target);
  const { closeThen, onDismissed } = useAfterSheetDismiss(onClose);

  if (!shown) return null;

  const run = (action: (t: StaffPatientActionTarget) => void) => () => closeThen(() => action(shown));

  const actions: DetailActionItem[] = [
    {
      key: 'profile',
      label: 'Voir le profil',
      icon: UserRound,
      tone: 'neutral',
      showChevron: false,
      onPress: run(onOpenProfile),
    },
    {
      key: 'appointment',
      label: 'Créer un rendez-vous',
      icon: CalendarPlus,
      tone: 'neutral',
      showChevron: false,
      onPress: run(onCreateAppointment),
    },
  ];
  if (shown.canDelete) {
    actions.push({
      key: 'delete',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      showChevron: false,
      onPress: run(onDelete),
    });
  }

  return (
    <SheetModal
      visible={target !== null}
      onClose={onClose}
      onDismissed={onDismissed}
      title={shown.name}
      disableScroll
    >
      <DetailActionList actions={actions} />
    </SheetModal>
  );
}
