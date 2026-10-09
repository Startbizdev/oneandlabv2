import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import {
  formatPassageTourListTimeLabel,
  isNursePassageAppointment,
  parsePassageAvailabilityRange,
  passageCustomTimeFromHour,
} from '@oneandlab/shared-utils';
import { beneficiaryDisplayName } from './beneficiary-display-name';
import { appointmentAddressLine } from './appointment-address';
import { capitalizeFrench, formatAvailabilityDisplayFr } from './appointment-datetime-fr';
import { rdvCatalogDisplayLines } from './rdv-catalog-lines';

export { appointmentAddressLine } from './appointment-address';

export function appointmentPatientName(apt: Appointment): string {
  const name = beneficiaryDisplayName(apt);
  return name && name !== '—' ? name : apt.category_name || 'Rendez-vous';
}

/** Créneau patient depuis form_data (availability ou champs legacy availability_type/range). */
export function resolveAppointmentAvailability(apt: Appointment): unknown {
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const raw = fd.availability;
  if (raw != null && String(raw).trim() !== '') return raw;

  const typ = String(fd.availability_type ?? '').trim().toLowerCase();
  if (typ === 'all_day' || typ === 'fullday' || typ === 'full_day') {
    return JSON.stringify({ type: 'all_day' });
  }
  if (typ === 'custom') {
    const start = fd.availability_start ?? fd.availabilityStart;
    const end = fd.availability_end ?? fd.availabilityEnd;
    if (start != null && end != null) {
      return JSON.stringify({ type: 'custom', range: [Number(start), Number(end)] });
    }
  }
  return null;
}

/**
 * Un passage à heure précise est enregistré comme une plage d'une heure commençant à cette heure :
 * même libellé que la tournée (« 12h30 »), plage seulement pour un créneau large (« Matin »…).
 */
function passageCreneauLabel(apt: Appointment, availability: unknown): string {
  const range = parsePassageAvailabilityRange(availability);
  return formatPassageTourListTimeLabel({
    availability,
    scheduled_at: apt.scheduled_at,
    passage_custom_time: range ? passageCustomTimeFromHour(range[0]) : null,
  });
}

export function appointmentCreneauLabel(apt: Appointment): string {
  const availability = resolveAppointmentAvailability(apt);
  if (isNursePassageAppointment(apt)) return passageCreneauLabel(apt, availability);
  return formatAvailabilityDisplayFr(availability, apt.scheduled_at);
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
