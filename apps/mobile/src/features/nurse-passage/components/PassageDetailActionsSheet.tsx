import { useMemo } from 'react';
import {
  CalendarPlus,
  Car,
  CheckCircle2,
  FileText,
  Layers,
  Trash2,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  DetailActionList,
  type DetailActionItem,
} from '@/features/appointments/detail/components/layout/DetailActionList';

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
  showDeleteSeries?: boolean;
  onMaterialize: () => void;
  onEnRoute: () => void;
  onMarkDone: () => void;
  onOpenFullAppointment: () => void;
  onDeleteOne: () => void;
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
  showDeleteSeries = true,
  onMaterialize,
  onEnRoute,
  onMarkDone,
  onOpenFullAppointment,
  onDeleteOne,
  onDeleteSeries,
}: Props) {
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
        onPress: () => {
          onClose();
          onEnRoute();
        },
      });
      items.push({
        key: 'mark_done',
        label: 'Marquer comme effectué',
        icon: CheckCircle2,
        tone: 'primary',
        loading: markDoneLoading,
        disabled: enRouteLoading || markDoneLoading,
        showChevron: false,
        onPress: () => {
          onClose();
          onMarkDone();
        },
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
        onPress: () => {
          onClose();
          onMaterialize();
        },
      });
    }

    items.push({
      key: 'full_appointment',
      label: 'Voir fiche RDV complète',
      icon: FileText,
      tone: 'neutral',
      showChevron: false,
      onPress: () => {
        onClose();
        onOpenFullAppointment();
      },
    });

    items.push({
      key: 'delete_one',
      label: 'Supprimer ce passage',
      icon: Trash2,
      tone: 'destructive',
      loading: deleteOneLoading,
      disabled: deleteOneLoading || deleteSeriesLoading,
      showChevron: false,
      onPress: () => {
        onClose();
        onDeleteOne();
      },
    });

    if (showDeleteSeries) {
      items.push({
        key: 'delete_series',
        label: 'Supprimer toute la série',
        icon: Layers,
        tone: 'destructive',
        loading: deleteSeriesLoading,
        disabled: deleteOneLoading || deleteSeriesLoading,
        showChevron: false,
        onPress: () => {
          onClose();
          onDeleteSeries();
        },
      });
    }

    return items;
  }, [
    deleteOneLoading,
    deleteSeriesLoading,
    enRouteLoading,
    hasStop,
    markDoneLoading,
    materializeLoading,
    onClose,
    onDeleteOne,
    onDeleteSeries,
    onEnRoute,
    onMarkDone,
    onMaterialize,
    onOpenFullAppointment,
    showMaterialize,
    showDeleteSeries,
  ]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Actions"
      disableScroll
    >
      <DetailActionList actions={actions} />
    </BottomSheet>
  );
}
