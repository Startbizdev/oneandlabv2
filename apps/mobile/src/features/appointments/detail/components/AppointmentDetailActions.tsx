import { Linking } from 'react-native';
import {
  CalendarPlus,
  MessageSquare,
  Navigation,
  XCircle,
} from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
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
  const status = String(apt.status ?? '');
  const canceled = isAppointmentCanceled(status);
  const active = ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);

  if (canceled) return null;

  const phone = patientPhone(apt);
  const showRescheduleNurse =
    role === 'nurse' && ['confirmed', 'inProgress', 'in_progress'].includes(status);
  const showRescheduleOther = (role === 'pro' || role === 'preleveur') && active;
  const showCancelNurse = showRescheduleNurse;
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

  if ((active && role !== 'nurse') || showCancelNurse) {
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
