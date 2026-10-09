import { Alert, Share } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CalendarPlus,
  RefreshCcw,
  Share2,
  Sparkles,
  XCircle,
} from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { appointmentDossierPatientId } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { updateAppointment } from '../../api/appointments.service';
import { releaseAndFetchShareForNurse } from '../api/appointment-detail.service';
import { buildNurseShareMessage } from '../utils/nurse-share-message';
import {
  appointmentSidebarCardVisible,
  getAppointmentSidebarTerminalEmpty,
} from '@/utils/appointment-sidebar-terminal';
import { effectiveAppointmentStatus } from '@/utils/effective-appointment-status';
import { detailSidebarActionFlags } from '../utils/detail-sidebar-action-flags';
import {
  DetailActionList,
  type DetailActionItem,
} from './layout/DetailActionList';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';

interface Props {
  role: string;
  viewerId?: string | null;
  apt: Appointment;
  onReschedule: () => void;
  onCancel: () => void;
  onShareDone?: () => void;
}

export function DetailSidebarActions({
  role,
  viewerId,
  apt,
  onReschedule,
  onCancel,
  onShareDone,
}: Props) {
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const status = effectiveAppointmentStatus(apt, { role, viewerId });
  const terminal = getAppointmentSidebarTerminalEmpty(status);

  const redispatchMut = useMutation({
    mutationFn: () => updateAppointment(apt.id, { status: 'pending', redispatch: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(apt.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
      void qc.invalidateQueries({ queryKey: ['patients', 'hub-search'] });
      toast('Rendez-vous proposé à d’autres professionnels', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'redispatch'),
  });

  const shareMut = useMutation({
    mutationFn: async () => {
      const res = await releaseAndFetchShareForNurse(apt.id);
      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Impossible de préparer le partage.');
      }
      const message = buildNurseShareMessage(res.data);
      if (!message) throw new Error('Impossible de préparer le partage.');
      await Share.share({ message });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.repended) onShareDone?.();
    },
    onError: (e) => handleApiError(e, toast, 'partage'),
  });

  if (!appointmentSidebarCardVisible(role, apt, viewerId)) return null;
  if (terminal) return null;

  const show = detailSidebarActionFlags(apt, { role, viewerId });

  const confirmRedispatch = () => {
    Alert.alert(
      'Céder ce rendez-vous ?',
      'Le rendez-vous repassera en attente pour être proposé à d’autres professionnels.',
      [
        { text: 'Garder', style: 'cancel' },
        { text: 'Céder', onPress: () => redispatchMut.mutate() },
      ],
    );
  };

  const actions: DetailActionItem[] = [];

  if (show.reschedule) {
    actions.push({
      key: 'reschedule',
      label: 'Reprendre le rendez-vous',
      hint: 'Nouveau créneau ou nouvelle demande',
      icon: CalendarPlus,
      tone: 'primary',
      onPress: onReschedule,
    });
  }

  if (show.share) {
    actions.push({
      key: 'share',
      label: 'Partager à un confrère',
      icon: Share2,
      tone: 'neutral',
      loading: shareMut.isPending,
      onPress: () => shareMut.mutate(),
    });
  }

  if (show.redispatch) {
    actions.push({
      key: 'redispatch',
      label: 'Céder le rendez-vous',
      hint: 'Le proposer à d’autres professionnels',
      icon: RefreshCcw,
      tone: 'caution',
      loading: redispatchMut.isPending,
      onPress: confirmRedispatch,
    });
  }

  if (role === 'patient' || role === 'pro' || role === 'nurse') {
    actions.push({
      key: 'ask-cary',
      label: 'Demander à Cary',
      icon: Sparkles,
      tone: 'neutral',
      onPress: () => {
        router.push(
          buildAiDeepLink(role, {
            conversation_type: 'appointment',
            appointment_id: apt.id,
            patient_id: appointmentDossierPatientId(apt) ?? undefined,
          }),
        );
      },
    });
  }

  if (show.cancel) {
    actions.push({
      key: 'cancel',
      label: 'Annuler le rendez-vous',
      icon: XCircle,
      tone: 'destructive',
      onPress: onCancel,
      showChevron: false,
    });
  }

  if (!actions.length) return null;

  return <DetailActionList actions={actions} />;
}
