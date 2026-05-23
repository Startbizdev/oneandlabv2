import { Alert, Linking, Share } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarPlus,
  MessageSquare,
  Navigation,
  RefreshCcw,
  Share2,
  XCircle,
} from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { updateAppointment } from '../../api/appointments.service';
import {
  fetchShareForNurse,
  type ShareForNurseData,
} from '../api/appointment-detail.service';
import { buildNurseShareMessage } from '../utils/nurse-share-message';
import {
  appointmentSidebarCardVisible,
  getAppointmentSidebarTerminalEmpty,
} from '@/utils/appointment-sidebar-terminal';
import {
  effectiveAppointmentStatus,
  nurseCanRescheduleOrCancel,
} from '@/utils/effective-appointment-status';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { appointmentAddressLine } from '@/utils/appointment-display';
import {
  DetailActionList,
  type DetailActionItem,
} from './layout/DetailActionList';

function patientPhone(apt: Appointment): string | null {
  const ext = apt as Appointment & {
    relative?: { phone?: string };
    form_data?: { phone?: string };
  };
  return ext.relative?.phone?.trim() || ext.form_data?.phone?.trim() || null;
}

function openWaze(apt: Appointment) {
  const addr = apt.address;
  try {
    const parsed = typeof addr === 'string' ? JSON.parse(addr) : addr;
    if (parsed?.lat != null && parsed?.lng != null) {
      void Linking.openURL(
        `https://waze.com/ul?ll=${parsed.lat},${parsed.lng}&navigate=yes`,
      );
      return;
    }
  } catch {
    /* ignore */
  }
  const line = appointmentAddressLine(apt);
  if (line) void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(line)}&navigate=yes`);
}

interface Props {
  role: string;
  viewerId?: string | null;
  apt: Appointment;
  onReschedule: () => void;
  onCancel: () => void;
  edgeToEdge?: boolean;
  shareData?: ShareForNurseData | null;
  shareLoading?: boolean;
  onShareDone?: () => void;
}

export function DetailSidebarActions({
  role,
  viewerId,
  apt,
  onReschedule,
  onCancel,
  edgeToEdge = false,
  shareData,
  shareLoading = false,
  onShareDone,
}: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const status = effectiveAppointmentStatus(apt, { role, viewerId });
  const terminal = getAppointmentSidebarTerminalEmpty(status);

  const redispatchMut = useMutation({
    mutationFn: () => updateAppointment(apt.id, { status: 'pending', redispatch: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(apt.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast('Demande redispatchée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'redispatch'),
  });

  const shareMut = useMutation({
    mutationFn: async () => {
      let data = shareData ?? null;
      if (!buildNurseShareMessage(data)) {
        const res = await fetchShareForNurse(apt.id);
        if (!res.success || !res.data) {
          throw new Error(res.error ?? 'Impossible de préparer le partage.');
        }
        data = res.data;
      }
      const message = buildNurseShareMessage(data);
      if (!message) throw new Error('Impossible de préparer le partage.');
      await Share.share({ message });
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({
        queryKey: ['appointments', 'share-for-nurse', apt.id],
      });
      if (data?.repended) onShareDone?.();
    },
    onError: (e) => handleApiError(e, toast, 'partage'),
  });

  if (!appointmentSidebarCardVisible(role, apt)) return null;
  if (terminal) return null;

  const rawStatus = String(apt.status ?? '');
  const active = ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);
  const canceled = isAppointmentCanceled(rawStatus);
  const nursing = isNursingAppointment(apt.type);
  const blood = isBloodTestAppointment(apt.type);
  const nurseManage = nurseCanRescheduleOrCancel(apt, { role, viewerId });

  const showRescheduleNurse = role === 'nurse' && nurseManage;
  const showRescheduleOther = (role === 'pro' || role === 'preleveur') && active;
  const showCancelNurse = role === 'nurse' && nurseManage;
  const showCancelOther = (role === 'pro' || role === 'preleveur') && active;
  const showRedispatchNonNursing =
    role === 'nurse' && status === 'confirmed' && !nursing && !blood;
  const showRedispatchInNursingBlock =
    role === 'nurse' && nursing && status === 'confirmed' && !canceled;
  const showShareNursing =
    role === 'nurse' && nursing && status !== 'completed' && !canceled;

  const confirmRedispatch = () => {
    Alert.alert(
      'Redispatcher ce rendez-vous ?',
      'Le rendez-vous repassera en attente pour être proposé à d’autres professionnels.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Redispatcher', onPress: () => redispatchMut.mutate() },
      ],
    );
  };

  const actions: DetailActionItem[] = [];

  if (showRescheduleNurse || showRescheduleOther) {
    actions.push({
      key: 'reschedule',
      label: role === 'nurse' ? 'Reprendre le RDV' : 'Reprendre pour ce patient',
      hint: 'Modifier la date ou le créneau',
      icon: CalendarPlus,
      tone: 'primary',
      onPress: onReschedule,
    });
  }

  if (role === 'preleveur' && active && patientPhone(apt)) {
    actions.push({
      key: 'message',
      label: 'Envoyer un message',
      hint: 'Contacter le patient par SMS',
      icon: MessageSquare,
      tone: 'neutral',
      onPress: () => void Linking.openURL(`sms:${patientPhone(apt)}`),
    });
  }

  if (role === 'preleveur' && active && apt.address) {
    actions.push({
      key: 'waze',
      label: 'Itinéraire Waze',
      hint: 'Ouvrir la navigation',
      icon: Navigation,
      tone: 'neutral',
      onPress: () => openWaze(apt),
    });
  }

  if (showRedispatchNonNursing || showRedispatchInNursingBlock) {
    actions.push({
      key: 'redispatch',
      label: 'Redispatcher',
      hint: 'Proposer à d’autres professionnels',
      icon: RefreshCcw,
      tone: 'caution',
      loading: redispatchMut.isPending,
      onPress: confirmRedispatch,
    });
  }

  if (showShareNursing) {
    actions.push({
      key: 'share',
      label: 'Partager le rendez-vous',
      hint: 'Lien token pour un confrère infirmier',
      icon: Share2,
      tone: 'neutral',
      loading: shareMut.isPending || shareLoading,
      onPress: () => shareMut.mutate(),
    });
  }

  if (showCancelNurse || showCancelOther) {
    actions.push({
      key: 'cancel',
      label: 'Annuler le rendez-vous',
      hint: 'Action irréversible',
      icon: XCircle,
      tone: 'destructive',
      onPress: onCancel,
      showChevron: false,
    });
  }

  if (!actions.length) return null;

  return <DetailActionList actions={actions} edgeToEdge={edgeToEdge} />;
}
