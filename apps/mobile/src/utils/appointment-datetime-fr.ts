/**
 * Créneau horaire patient (form_data.availability), aligné frontend/utils/appointment-datetime-fr.ts.
 */

import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  formatPassageTimeSlotFromFormData,
  isNursePassageFormData,
} from '@oneandlab/shared-utils';
import {
  formatPatientUrgentCreneauShortFr,
  isPatientVipSlotShortLabel,
} from './patient-urgency-display';

dayjs.locale('fr');

/** « vendredi » → « Vendredi » */
export function capitalizeFrench(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function formatFrenchWeekdayDate(
  scheduledAt?: string | null,
  pattern = 'dddd D MMMM YYYY',
): string {
  if (!scheduledAt) return '';
  return capitalizeFrench(dayjs(scheduledAt).format(pattern));
}

const MIN_SLOT_SPAN_HOURS = 1;
const PARIS_TZ = 'Europe/Paris';

function rangeToHourSpanLabel(range: unknown[]): string {
  const start = Math.floor(Number(range[0]));
  const end = Math.floor(Number(range[1]));
  if (Number.isNaN(start) || Number.isNaN(end)) return '';
  if (end - start < MIN_SLOT_SPAN_HOURS) return '';
  return `${start}h à ${end}h`;
}

function specificSlotFreeformLabel(avail: Record<string, unknown>): string {
  const raw = avail.time ?? avail.timeSlot ?? avail.time_slot ?? avail.slot ?? avail.start;
  if (raw == null || String(raw).trim() === '') return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const h = Math.floor(raw);
    if (h >= 0 && h <= 23) {
      const end = Math.min(23, h + MIN_SLOT_SPAN_HOURS);
      return `${h}h à ${end}h`;
    }
  }
  const s = String(raw).trim();
  const rangeRe = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/i.exec(s);
  if (rangeRe) {
    const h1 = parseInt(rangeRe[1]!, 10);
    const m1 = parseInt(rangeRe[2]!, 10);
    const h2 = parseInt(rangeRe[3]!, 10);
    const m2 = parseInt(rangeRe[4]!, 10);
    if (h1 > h2 || (h1 === h2 && m1 >= m2)) return '';
    return `créneau ${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')} - ${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
  }
  const single = /^(\d{1,2}):(\d{2})$/i.exec(s);
  if (single) {
    const h = parseInt(single[1]!, 10);
    const m = parseInt(single[2]!, 10);
    if (h < 0 || h > 23) return '';
    let endH = h + MIN_SLOT_SPAN_HOURS;
    let endM = m;
    if (endH >= 24) {
      endH = 23;
      endM = m;
    }
    return `créneau ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }
  return `créneau ${s}`;
}

function availabilitySuggestsSlotButNoParsedRange(availability: unknown, slotLabel: string): boolean {
  if (slotLabel !== '') return false;
  if (availability == null) return false;
  try {
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return false;
      const low = trimmed.toLowerCase();
      if (low === 'specificslot' || low === 'specific_slot') return true;
      const o = JSON.parse(trimmed) as { type?: string };
      const typ = String(o?.type ?? '').toLowerCase().replace(/-/g, '_');
      return typ === 'specificslot' || typ === 'specific_slot';
    }
    if (typeof availability === 'object' && availability !== null && !Array.isArray(availability)) {
      const typ = String((availability as { type?: string }).type ?? '').toLowerCase().replace(/-/g, '_');
      return typ === 'specificslot' || typ === 'specific_slot';
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function formatAvailabilitySlotFr(availability: unknown): string {
  if (availability == null) return '';
  try {
    let avail: Record<string, unknown> | null = null;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return '';
      const low = trimmed.toLowerCase();
      if (low === 'allday' || low === 'full_day' || low === 'fullday') {
        return 'toute la journée';
      }
      if (low === 'specificslot' || low === 'specific_slot') {
        return '';
      }
      avail = JSON.parse(trimmed) as Record<string, unknown>;
    } else if (typeof availability === 'object' && !Array.isArray(availability)) {
      avail = availability as Record<string, unknown>;
    }
    if (!avail) return '';

    const urgentLabel = formatPatientUrgentCreneauShortFr(avail);
    if (urgentLabel) return urgentLabel;

    const typ = String(avail.type ?? '').toLowerCase().replace(/-/g, '_');

    if (typ === 'all_day' || typ === 'fullday' || typ === 'full_day') {
      return 'toute la journée';
    }

    if (
      (typ === 'custom' || typ === 'specificslot' || typ === 'specific_slot' || typ === '') &&
      Array.isArray(avail.range) &&
      avail.range.length >= 2
    ) {
      const label = rangeToHourSpanLabel(avail.range);
      if (label) return label;
    }

    if (typ === 'specificslot' || typ === 'specific_slot') {
      return specificSlotFreeformLabel(avail);
    }
  } catch {
    /* ignore */
  }
  return '';
}

function formatScheduledDateOnlyParis(scheduledAt: string): string {
  try {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      timeZone: PARIS_TZ,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatScheduledDateWithAvailabilityLineFr(
  scheduledAt: string | null | undefined,
  availability: unknown,
): string {
  if (!scheduledAt) return '';
  const datePart = formatScheduledDateOnlyParis(scheduledAt);
  if (!datePart) return '';

  const raw = formatAvailabilitySlotFr(availability);
  if (isPatientVipSlotShortLabel(raw)) {
    return `${datePart} · ${raw}`;
  }
  if (raw === 'toute la journée') {
    return `${datePart} · Disponible toute la journée`;
  }
  if (raw.startsWith('créneau ')) {
    const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
    return `${datePart} · ${cap}`;
  }
  const rangeMatch = raw.match(/^(\d+)h à (\d+)h$/);
  if (rangeMatch) {
    return `${datePart} entre ${rangeMatch[1]}h et ${rangeMatch[2]}h`;
  }

  if (availabilitySuggestsSlotButNoParsedRange(availability, raw)) {
    return datePart;
  }

  try {
    const d = new Date(scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      const timePart = d.toLocaleTimeString('fr-FR', {
        timeZone: PARIS_TZ,
        hour: '2-digit',
        minute: '2-digit',
      });
      if (raw === '') {
        return `${datePart} à ${timePart}`;
      }
    }
  } catch {
    /* ignore */
  }

  return datePart;
}

/** Libellé court créneau : « Toute la journée », « 9h00 - 11h00 », ou heure Paris depuis scheduled_at. */
export function formatAvailabilityDisplayFr(
  availability: unknown,
  scheduledAt?: string | null,
  formData?: Record<string, unknown> | null,
): string {
  if (formData && isNursePassageFormData(formData)) {
    return formatPassageTimeSlotFromFormData(formData, scheduledAt);
  }

  const raw = formatAvailabilitySlotFr(availability);
  if (isPatientVipSlotShortLabel(raw)) return raw;
  if (raw === 'toute la journée') return 'Toute la journée';
  if (raw.startsWith('créneau ')) {
    return 'C' + raw.slice(1);
  }
  const rangeMatch = raw.match(/^(\d+)h à (\d+)h$/);
  if (rangeMatch) {
    return `${rangeMatch[1]}h00 - ${rangeMatch[2]}h00`;
  }
  if (availabilitySuggestsSlotButNoParsedRange(availability, raw)) {
    return '';
  }
  if (scheduledAt) {
    try {
      const d = new Date(scheduledAt);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString('fr-FR', {
          timeZone: PARIS_TZ,
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

export function formatAppointmentDateTime(
  scheduledAt: string | undefined | null,
  availability?: unknown,
): string {
  if (!scheduledAt) return '—';
  const datePart = dayjs(scheduledAt).format('dddd D MMMM YYYY');
  const slot = formatAvailabilityDisplayFr(availability, scheduledAt);
  return slot ? `${datePart} · ${slot}` : datePart;
}

export function formatAppointmentDateShort(
  scheduledAt: string | undefined | null,
  availability?: unknown,
): string {
  if (!scheduledAt) return '—';
  const datePart = dayjs(scheduledAt).format('ddd D MMM');
  const slot = formatAvailabilityDisplayFr(availability, scheduledAt);
  return slot ? `${datePart} · ${slot}` : datePart;
}
