/**
 * Créneau horaire patient (form_data.availability), aligné listes + fiche.
 * Gère all_day, custom, legacy specificSlot, mots-clés non JSON (fullday / specificslot), Horaire VIP patient.
 */

import {
  formatPatientUrgentCreneauShortFr,
  isPatientVipSlotShortLabel,
} from '~/utils/patient-urgency-display';
import {
  formatPassageTimeSlotFromFormData,
  isNursePassageFormData,
} from '@oneandlab/shared-utils';

const MIN_SLOT_SPAN_HOURS = 1;

function rangeToHourSpanLabel(range: unknown[]): string {
  const start = Math.floor(Number(range[0]));
  const end = Math.floor(Number(range[1]));
  if (Number.isNaN(start) || Number.isNaN(end)) return '';
  if (end - start < MIN_SLOT_SPAN_HOURS) return '';
  return `${start}h à ${end}h`;
}

/** Heures « libres » legacy (time / timeSlot) : plage ou une seule heure → au moins 1 h. */
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

/** Présence d’un type « créneau précis » sans plage exploitable → ne pas afficher l’heure de `scheduled_at` (souvent UTC / placeholder). */
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
    let avail: any = availability;
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
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return '';

    const urgentLabel = formatPatientUrgentCreneauShortFr(avail as unknown);
    if (urgentLabel) return urgentLabel;

    const typ = String(avail.type ?? '').toLowerCase().replace(/-/g, '_');

    if (typ === 'all_day' || typ === 'fullday' || typ === 'full_day') {
      return 'toute la journée';
    }

    // Plage [début, fin] : même logique pour custom et specific_slot (prise de RDV = ≥ 1 h).
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
    // ignore
  }
  return '';
}

const PARIS_TZ = 'Europe/Paris';

function parisCalendarPartsFromInstant(ms: number): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const read = (typ: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === typ)?.value ?? 'NaN', 10);
  return { y: read('year'), m: read('month'), d: read('day') };
}

/** Instant UTC correspondant à une heure murale Paris (jour Y-M-D). */
function utcMillisForParisWallClock(y: number, m: number, d: number, hour: number, minute: number): number {
  let t = Date.UTC(y, m - 1, d, hour - 1, minute, 0, 0);
  for (let i = 0; i < 14; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: PARIS_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(t));
    const read = (typ: Intl.DateTimeFormatPartTypes) =>
      parseInt(parts.find((p) => p.type === typ)?.value ?? '0', 10);
    const gy = read('year');
    const gm = read('month');
    const gd = read('day');
    const gh = read('hour');
    const gmin = read('minute');
    if (gy === y && gm === m && gd === d && gh === hour && gmin === minute) return t;
    t += ((hour - gh) * 3600 + (minute - gmin) * 60) * 1000;
  }
  return t;
}

function tryAvailabilityRangeHours(
  availability: unknown,
): { start: number; end: number } | null {
  if (availability == null) return null;
  try {
    let avail: any = availability;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return null;
      const low = trimmed.toLowerCase();
      if (low === 'allday' || low === 'full_day' || low === 'fullday') return null;
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return null;
    const typ = String(avail.type ?? '').toLowerCase().replace(/-/g, '_');
    if (typ === 'all_day' || typ === 'fullday' || typ === 'full_day') return null;
    if (
      (typ === 'custom' || typ === 'specificslot' || typ === 'specific_slot' || typ === '') &&
      Array.isArray(avail.range) &&
      avail.range.length >= 2
    ) {
      const start = Math.floor(Number(avail.range[0]));
      const end = Math.floor(Number(avail.range[1]));
      if (!Number.isNaN(start) && !Number.isNaN(end) && end - start >= MIN_SLOT_SPAN_HOURS) {
        return { start, end };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Tournée préleveur : le créneau est considéré « terminé » (affichage type « passage fait »)
 * lorsque l’instant actuel dépasse la fin du créneau au fuseau Paris (ou +1 h sur `scheduled_at` en secours).
 */
export function isAppointmentSlotEndedForPreleveurTournee(apt: {
  scheduled_at?: string | null;
  form_data?: { availability?: unknown } | null;
}): boolean {
  const scheduledAt = apt?.scheduled_at;
  if (!scheduledAt) return false;
  const tSched = new Date(scheduledAt).getTime();
  if (Number.isNaN(tSched)) return false;
  const now = Date.now();

  const { y, m, d } = parisCalendarPartsFromInstant(tSched);

  const rangeH = tryAvailabilityRangeHours(apt?.form_data?.availability);
  if (rangeH) {
    const endMs = utcMillisForParisWallClock(y, m, d, rangeH.end, 0);
    return now > endMs;
  }

  const raw = formatAvailabilitySlotFr(apt?.form_data?.availability);
  if (raw === 'toute la journée') {
    const endMs = utcMillisForParisWallClock(y, m, d, 23, 59);
    return now > endMs;
  }
  const rangeMatch = raw.match(/^(\d+)h à (\d+)h$/);
  if (rangeMatch) {
    const endH = parseInt(rangeMatch[2]!, 10);
    const endMs = utcMillisForParisWallClock(y, m, d, endH, 0);
    return now > endMs;
  }
  const cm = raw.match(/^créneau (\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/i);
  if (cm) {
    const endH = parseInt(cm[3]!, 10);
    const endM = parseInt(cm[4]!, 10);
    const endMs = utcMillisForParisWallClock(y, m, d, endH, endM);
    return now > endMs;
  }

  return now > tSched + MIN_SLOT_SPAN_HOURS * 3600 * 1000;
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

/**
 * Fiche RDV : date et disponibilité patient sur une seule ligne (gain de place).
 * Ex. « 12 mai 2026 entre 9h et 11h », « 12 mai 2026 · Disponible toute la journée », ou heure issue de `scheduled_at`.
 */
export function formatScheduledDateWithAvailabilityLineFr(
  scheduledAt: string | null | undefined,
  availability: unknown,
  formData?: Record<string, unknown> | null,
): string {
  if (!scheduledAt) return '';
  const datePart = formatScheduledDateOnlyParis(scheduledAt);
  if (!datePart) return '';

  if (formData && isNursePassageFormData(formData)) {
    const slot = formatPassageTimeSlotFromFormData(formData, scheduledAt);
    return slot ? `${datePart} · ${slot}` : datePart;
  }

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

/**
 * Libellé UI cartes / fiche : « Toute la journée », « 9h00 - 11h00 », « Créneau 08:30 - 09:30 »,
 * ou heure issue de `scheduled_at` seulement si le créneau ne définit pas un type « horaire précis » legacy.
 */
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
        return d.toLocaleTimeString('fr-FR', { timeZone: PARIS_TZ, hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

/**
 * Date + heure ou créneau pour un SMS au patient (français, fuseau local).
 */
export function formatAppointmentWhenForSms(apt: {
  scheduled_at?: string | null;
  form_data?: { availability?: unknown } | null;
}): string {
  if (!apt?.scheduled_at) return '';
  let d: Date;
  try {
    d = new Date(apt.scheduled_at);
    if (Number.isNaN(d.getTime())) return String(apt.scheduled_at);
  } catch {
    return String(apt.scheduled_at);
  }

  const datePart = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const slot = formatAvailabilitySlotFr(apt.form_data?.availability);
  if (isPatientVipSlotShortLabel(slot)) {
    return `${datePart} — ${slot}`;
  }
  if (slot === 'toute la journée') {
    return `${datePart} (${slot})`;
  }
  if (slot) {
    if (slot.startsWith('créneau ')) {
      const capitalized = slot.charAt(0).toUpperCase() + slot.slice(1);
      return `${datePart}, ${capitalized}`;
    }
    return `${datePart}, créneau ${slot}`;
  }

  if (availabilitySuggestsSlotButNoParsedRange(apt.form_data?.availability, slot)) {
    return datePart;
  }

  const timePart = d.toLocaleTimeString('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} à ${timePart}`;
}
