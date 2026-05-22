import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import { beneficiaryDisplayName } from '@/features/appointments/detail/utils/patient-appointment-display';
import { capitalizeFrench, formatAvailabilityDisplayFr } from './appointment-datetime-fr';
import { rdvCatalogDisplayLines } from './rdv-catalog-lines';

export function appointmentPatientName(apt: Appointment): string {
  const name = beneficiaryDisplayName(apt);
  return name && name !== '—' ? name : apt.category_name || 'Rendez-vous';
}

export function appointmentAddressLine(apt: Appointment): string {
  const fd = apt.form_data as { address?: { label?: string }; address_label?: string } | undefined;
  if (fd?.address?.label) return fd.address.label;
  if (fd?.address_label) return String(fd.address_label);
  if (typeof apt.address === 'string') {
    try {
      const p = JSON.parse(apt.address) as { label?: string };
      return p.label ?? apt.address;
    } catch {
      return apt.address;
    }
  }
  if (apt.address && typeof apt.address === 'object' && 'label' in apt.address) {
    return String((apt.address as { label?: string }).label ?? '');
  }
  return '';
}

export function appointmentCreneauLabel(apt: Appointment): string {
  const fd = apt.form_data as { availability?: unknown } | undefined;
  return formatAvailabilityDisplayFr(fd?.availability, apt.scheduled_at);
}

export function appointmentCareLines(apt: Appointment): string[] {
  return rdvCatalogDisplayLines(apt).map((l) => l.label);
}

export function formatDateCompact(scheduledAt?: string | null): string {
  if (!scheduledAt) return '';
  const d = dayjs(scheduledAt);
  if (d.isSame(dayjs(), 'day')) return "Aujourd'hui";
  return capitalizeFrench(d.format('ddd D MMM'));
}
