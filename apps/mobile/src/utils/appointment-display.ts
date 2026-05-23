import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import { beneficiaryDisplayName } from './beneficiary-display-name';
import { appointmentAddressLine } from './appointment-address';
import { capitalizeFrench, formatAvailabilityDisplayFr } from './appointment-datetime-fr';
import { rdvCatalogDisplayLines } from './rdv-catalog-lines';

export { appointmentAddressLine } from './appointment-address';

export function appointmentPatientName(apt: Appointment): string {
  const name = beneficiaryDisplayName(apt);
  return name && name !== '—' ? name : apt.category_name || 'Rendez-vous';
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
