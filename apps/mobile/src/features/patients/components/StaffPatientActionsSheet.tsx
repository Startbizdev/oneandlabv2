import { CalendarPlus, Trash2, UserRound } from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
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
  const actions: DetailActionItem[] = [];
  if (target) {
    const run = (action: (t: StaffPatientActionTarget) => void) => () => {
      onClose();
      action(target);
    };
    actions.push(
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
    );
    if (target.canDelete) {
      actions.push({
        key: 'delete',
        label: 'Supprimer',
        icon: Trash2,
        tone: 'destructive',
        showChevron: false,
        onPress: run(onDelete),
      });
    }
  }

  return (
    <SheetModal visible={Boolean(target)} onClose={onClose} title={target?.name ?? ''} disableScroll>
      <DetailActionList actions={actions} />
    </SheetModal>
  );
}
