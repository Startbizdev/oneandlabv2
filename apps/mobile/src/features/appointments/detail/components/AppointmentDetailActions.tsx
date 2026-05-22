import { Alert, Linking } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarPlus,
  MessageSquare,
  Navigation,
  RefreshCcw,
  XCircle,
} from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { updateAppointment } from '../../api/appointments.service';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { appointmentAddressLine } from '@/utils/appointment-display';
import {
  DetailActionList,
  type DetailActionItem,
} from './layout/DetailActionList';

interface Props {
  role: string;
  apt: Appointment;
  onReschedule: () => void;
  onCancel: () => void;
  edgeToEdge?: boolean;
}

function patientPhone(apt: Appointment): string | null {
  const rel = (apt as Appointment & { relative?: { phone?: string } }).relative;
  const fd = apt.form_data as { phone?: string } | undefined;
  return rel?.phone?.trim() || fd?.phone?.trim() || null;
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

export function AppointmentDetailActions({
  role,
  apt,
  onReschedule,
  onCancel,
  edgeToEdge = false,
}: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const status = String(apt.status ?? '');
  const canceled = isAppointmentCanceled(status);
  const active = ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);

  const redispatchMut = useMutation({
    mutationFn: () =>
      updateAppointment(apt.id, { status: 'pending', redispatch: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(apt.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      toast('Demande redispatchée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'redispatch'),
  });

  if (canceled) return null;

  const phone = patientPhone(apt);
  const showRescheduleNurse =
    role === 'nurse' && ['confirmed', 'inProgress', 'in_progress'].includes(status);
  const showRescheduleOther = (role === 'pro' || role === 'preleveur') && active;
  const showRedispatchNurse =
    role === 'nurse' &&
    status === 'confirmed' &&
    (!isNursingAppointment(apt.type) || isBloodTestAppointment(apt.type));
  const showRedispatchNursing =
    role === 'nurse' &&
    status === 'confirmed' &&
    isNursingAppointment(apt.type) &&
    !isBloodTestAppointment(apt.type);

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

  if (role === 'preleveur' && phone) {
    actions.push({
      key: 'message',
      label: 'Message au patient',
      hint: 'Contacter par SMS',
      icon: MessageSquare,
      tone: 'neutral',
      onPress: () => void Linking.openURL(`sms:${phone}`),
    });
  }

  if (role === 'preleveur' && apt.address) {
    actions.push({
      key: 'waze',
      label: 'Itinéraire Waze',
      hint: 'Ouvrir la navigation',
      icon: Navigation,
      tone: 'neutral',
      onPress: () => openWaze(apt),
    });
  }

  if (showRedispatchNurse || showRedispatchNursing) {
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

  if (active) {
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
