import { useMemo } from 'react';
import {
  CalendarPlus,
  Car,
  CheckCircle2,
  AlarmClockOff,
  FileText,
  Layers,
  MessageSquarePlus,
  NotebookPen,
  Trash2,
  UserX,
} from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import {
  DetailActionList,
  type DetailActionItem,
} from '@/features/appointments/detail/components/layout/DetailActionList';
import { useAfterSheetDismiss } from '@/components/ui/sheet/use-after-sheet-dismiss';

type Props = {
  visible: boolean;
  onClose: () => void;
  hasStop: boolean;
  showMaterialize: boolean;
  materializeLoading: boolean;
  enRouteLoading: boolean;
  markDoneLoading: boolean;
  deleteOneLoading: boolean;
  deleteSeriesLoading: boolean;
  removeSlotLoading?: boolean;
  showDeleteSeries?: boolean;
  showDeleteOne?: boolean;
  /** Série à plusieurs créneaux par jour : retirer le créneau de ce passage. */
  showRemoveSlot?: boolean;
  hasPatient?: boolean;
  isPatientAbsent?: boolean;
  onMaterialize: () => void;
  onEnRoute: () => void;
  onMarkDone: () => void;
  onManageAbsence?: () => void;
  onAddTransmission?: () => void;
  onOpenTransmissions?: () => void;
  onOpenFullAppointment: () => void;
  onDeleteOne: () => void;
  onRemoveSlot?: () => void;
  onDeleteSeries: () => void;
};

export function PassageDetailActionsSheet({
  visible,
  onClose,
  hasStop,
  showMaterialize,
  materializeLoading,
  enRouteLoading,
  markDoneLoading,
  deleteOneLoading,
  deleteSeriesLoading,
  removeSlotLoading = false,
  showDeleteSeries = true,
  showDeleteOne = true,
  showRemoveSlot = false,
  hasPatient = false,
  isPatientAbsent = false,
  onMaterialize,
  onEnRoute,
  onMarkDone,
  onManageAbsence,
  onAddTransmission,
  onOpenTransmissions,
  onOpenFullAppointment,
  onDeleteOne,
  onRemoveSlot,
  onDeleteSeries,
}: Props) {
  const { closeThen, onDismissed } = useAfterSheetDismiss(onClose);

  const actions = useMemo(() => {
    const items: DetailActionItem[] = [];

    if (hasStop) {
      items.push({
        key: 'en_route',
        label: 'Je pars — prévenir le patient',
        icon: Car,
        tone: 'primary',
        loading: enRouteLoading,
        disabled: enRouteLoading || markDoneLoading,
        showChevron: false,
        onPress: () => closeThen(onEnRoute),
      });
      items.push({
        key: 'mark_done',
        label: 'Marquer comme effectué',
        icon: CheckCircle2,
        tone: 'primary',
        loading: markDoneLoading,
        disabled: enRouteLoading || markDoneLoading,
        showChevron: false,
        onPress: () => closeThen(onMarkDone),
      });
    }

    if (showMaterialize) {
      items.push({
        key: 'materialize',
        label: 'Planifier ce jour',
        icon: CalendarPlus,
        tone: 'neutral',
        loading: materializeLoading,
        disabled: materializeLoading,
        showChevron: false,
        onPress: () => closeThen(onMaterialize),
      });
    }

    if (hasPatient && onManageAbsence) {
      items.push({
        key: 'absence',
        label: isPatientAbsent ? 'Modifier l\'absence du patient' : 'Déclarer une absence',
        icon: UserX,
        tone: 'neutral',
        showChevron: false,
        onPress: () => closeThen(onManageAbsence),
      });
    }

    if (hasPatient && onAddTransmission) {
      items.push({
        key: 'add_transmission',
        label: 'Ajouter une transmission',
        icon: MessageSquarePlus,
        tone: 'neutral',
        showChevron: false,
        onPress: () => closeThen(onAddTransmission),
      });
    }

    if (hasPatient && onOpenTransmissions) {
      items.push({
        key: 'transmissions',
        label: 'Transmissions du patient',
        icon: NotebookPen,
        tone: 'neutral',
        showChevron: false,
        onPress: () => closeThen(onOpenTransmissions),
      });
    }

    items.push({
      key: 'full_appointment',
      label: 'Voir fiche RDV complète',
      icon: FileText,
      tone: 'neutral',
      showChevron: false,
      onPress: () => closeThen(onOpenFullAppointment),
    });

    const deleting = deleteOneLoading || deleteSeriesLoading || removeSlotLoading;

    if (showDeleteOne) {
      items.push({
        key: 'delete_one',
        label: 'Supprimer ce passage',
        icon: Trash2,
        tone: 'destructive',
        loading: deleteOneLoading,
        disabled: deleting,
        showChevron: false,
        onPress: () => closeThen(onDeleteOne),
      });
    }

    if (showRemoveSlot && onRemoveSlot) {
      items.push({
        key: 'remove_slot',
        label: 'Retirer ce créneau de la série',
        icon: AlarmClockOff,
        tone: 'destructive',
        loading: removeSlotLoading,
        disabled: deleting,
        showChevron: false,
        onPress: () => closeThen(onRemoveSlot),
      });
    }

    if (showDeleteSeries) {
      items.push({
        key: 'delete_series',
        label: 'Supprimer toute la série',
        icon: Layers,
        tone: 'destructive',
        loading: deleteSeriesLoading,
        disabled: deleting,
        showChevron: false,
        onPress: () => closeThen(onDeleteSeries),
      });
    }

    return items;
  }, [
    closeThen,
    deleteOneLoading,
    deleteSeriesLoading,
    removeSlotLoading,
    showRemoveSlot,
    onRemoveSlot,
    enRouteLoading,
    hasStop,
    markDoneLoading,
    materializeLoading,
    onDeleteOne,
    onDeleteSeries,
    onEnRoute,
    onMarkDone,
    onManageAbsence,
    onAddTransmission,
    onOpenTransmissions,
    onMaterialize,
    onOpenFullAppointment,
    hasPatient,
    isPatientAbsent,
    showMaterialize,
    showDeleteSeries,
    showDeleteOne,
  ]);

  return (
    <SheetModal visible={visible} onClose={onClose} onDismissed={onDismissed} title="Actions">
      <DetailActionList actions={actions} />
    </SheetModal>
  );
}
