import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CANCELLATION_REASONS } from '@oneandlab/shared-constants';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { appointmentAddressLine } from './appointment-display';
import { formatScheduledDateWithAvailabilityLineFr } from './appointment-datetime-fr';

dayjs.locale('fr');

export {
  formatAvailabilityDisplayFr,
  formatAvailabilitySlotFr,
  formatScheduledDateWithAvailabilityLineFr,
} from './appointment-datetime-fr';

const NURSING_DURATION_LABELS: Record<string, string> = {
  '1': 'Une seule fois',
  '7': 'Environ 1 semaine',
  '10': 'Environ 10 jours',
  '15': 'Environ 2 semaines',
  '30': 'Environ 1 mois',
  '60+': 'Longue durée',
  to_define: 'À préciser avec le professionnel',
};

const BLOOD_SERIES_LABELS: Record<string, string> = {
  '2': '2 jours',
  '3': '3 jours',
  '5': '5 jours',
  '7': '7 jours',
  '10': '10 jours',
  '15': '15 jours',
};

const FREQUENCY_LABELS: Record<string, string> = {
  once_daily: '1 fois par jour',
  twice_daily: '2 fois par jour',
  thrice_daily: '3 fois par jour',
  twice_weekly: '2 fois par semaine',
  thrice_weekly: '3 fois par semaine',
  to_define: 'À voir avec le professionnel',
  daily: '1 fois par jour',
  every_other_day: '1 jour sur 2',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  child: 'Enfant',
  parent: 'Parent',
  spouse: 'Conjoint(e)',
  sibling: 'Frère/Sœur',
  grandparent: 'Grand-parent',
  grandchild: 'Petit-enfant',
  other: 'Autre',
};

export type DetailKvRow = { label: string; value: string; strikethrough?: boolean };

export function getRelationshipLabel(r: string | undefined): string {
  if (!r) return '';
  return RELATIONSHIP_LABELS[r] ?? r;
}

export function getNursingDurationLabel(
  durationDays: string | null | undefined,
  customDays?: number | null,
): string {
  if (!durationDays) return '';
  if (durationDays === 'to_define') return NURSING_DURATION_LABELS.to_define;
  if (durationDays === 'custom') {
    if (customDays != null && customDays > 0) return `${customDays} jours`;
    return 'Durée personnalisée';
  }
  return NURSING_DURATION_LABELS[durationDays] ?? durationDays;
}

export function formatBloodTestSeriesDurationDays(
  durationDays: string | null | undefined,
  customDays?: number | null,
): string {
  const v = (durationDays ?? '').trim();
  if (!v) return '';
  if (v === 'custom') {
    if (customDays != null && customDays > 0) return `${customDays} jours`;
    return 'Durée personnalisée';
  }
  return BLOOD_SERIES_LABELS[v] ?? `${v} jours`;
}

export function getBloodTestTypeLabel(fd: Record<string, unknown>): string {
  const t = fd.blood_test_type;
  if (!t) return '';
  if (t === 'single') return 'Un seul prélèvement';
  if (t === 'multiple') {
    const label = formatBloodTestSeriesDurationDays(
      String(fd.duration_days ?? ''),
      fd.custom_days != null ? Number(fd.custom_days) : null,
    );
    return label ? `Plusieurs prélèvements sur ${label}` : 'Plusieurs prélèvements sur plusieurs jours';
  }
  return String(t);
}

export function getFrequencyLabel(v: string): string {
  return FREQUENCY_LABELS[v] ?? v;
}

export function getPreferredNurseGenderLabel(v: string | undefined): string {
  if (!v || v === 'any') return 'Sans préférence';
  if (v === 'female') return 'Infirmière';
  if (v === 'male') return 'Infirmier';
  return v;
}

export function getAppointmentNotes(apt: Appointment | null | undefined): string {
  const fd = apt?.form_data as { notes?: unknown } | undefined;
  const fromForm = fd?.notes;
  if (typeof fromForm === 'string' && fromForm.trim()) return fromForm.trim();
  const legacy = (apt as { notes?: unknown })?.notes;
  if (typeof legacy === 'string' && legacy.trim()) return legacy.trim();
  return '';
}

export function isAppointmentCanceled(status: string | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'canceled' || s === 'cancelled';
}

function filterItemsForAppt(appt: Appointment, items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (items.length <= 1) return items;
  const aptId = appt.id != null ? String(appt.id) : '';
  const persisted = items.filter((i) => {
    if (i.id == null || String(i.id).trim() === '') return false;
    const rowApt = i.appointment_id != null ? String(i.appointment_id) : '';
    return aptId === '' || !rowApt || rowApt === aptId;
  });
  if (persisted.length > 0) return persisted;
  const cid = appt.category_id != null ? String(appt.category_id) : '';
  if (cid) {
    const byCat = items.filter((i) => String(i.category_id ?? '') === cid);
    if (byCat.length > 0) return byCat;
  }
  const name = String(appt.category_name ?? '').trim().toLowerCase();
  if (name) {
    const byLabel = items.filter((i) => {
      const lab = String(i.label ?? i.category_name ?? '').trim().toLowerCase();
      return lab === name;
    });
    if (byLabel.length > 0) return byLabel;
  }
  return items;
}

function getNursingItems(appt: Appointment): Array<Record<string, unknown>> {
  const ext = appt as Appointment & { nursing_items?: unknown; nursing_items_display?: unknown };
  const raw = ext.nursing_items_display ?? ext.nursing_items;
  const items = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
  if (appt.type !== 'nursing') return items;
  return filterItemsForAppt(appt, items);
}

export function appointmentHasMultipleCareLines(appt: Appointment): boolean {
  return getNursingItems(appt).length > 1 || getBloodItems(appt).length > 1;
}

function getBloodItems(appt: Appointment): Array<Record<string, unknown>> {
  const ext = appt as Appointment & { blood_test_items?: unknown };
  const raw = ext.blood_test_items;
  const items = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
  if (!isBloodTestAppointment(appt.type)) return items;
  return filterItemsForAppt(appt, items);
}

function itemLabel(item: Record<string, unknown>): string {
  return String(item.label ?? item.category_name ?? '—').trim() || '—';
}

export function getAddressComplement(apt: Appointment): string {
  const fd = apt.form_data as { address_complement?: string } | undefined;
  if (fd?.address_complement?.trim()) return fd.address_complement.trim();
  try {
    const addr = typeof apt.address === 'string' ? JSON.parse(apt.address) : apt.address;
    if (addr && typeof addr === 'object' && 'complement' in addr) {
      return String((addr as { complement?: string }).complement ?? '').trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

export function getCancellationMotifLine(apt: Appointment): string {
  const ext = apt as unknown as Record<string, unknown>;
  const reasonCode = String(ext.cancellation_reason ?? '').trim();
  const reason = reasonCode ? (CANCELLATION_REASONS[reasonCode] ?? reasonCode) : '';
  const comment = String(ext.cancellation_comment ?? '').trim();
  const parts = [reason, comment].filter(Boolean);
  return parts.join(' — ');
}

/** Lignes KV alignées sur `AppointmentDetailRdvFieldRows` (variant default). */
export function buildAppointmentDetailKvRows(
  apt: Appointment,
  opts: {
    hideAddress?: boolean;
    hideScheduledDate?: boolean;
    /** Masque « Soins prévus » / type de soin si identique au titre de l’écran */
    titleContext?: string | null;
    hideCreatedAt?: boolean;
  } = {},
): DetailKvRow[] {
  const rows: DetailKvRow[] = [];
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const canceled = isAppointmentCanceled(apt.status);
  const strike = canceled;

  if (!opts.hideAddress) {
    const addr = appointmentAddressLine(apt);
    if (addr) rows.push({ label: 'Adresse', value: addr });
    const complement = getAddressComplement(apt);
    if (complement) rows.push({ label: 'Complément', value: complement });
  }

  if (!opts.hideScheduledDate) {
    const dateLine = formatScheduledDateWithAvailabilityLineFr(apt.scheduled_at, fd.availability);
    if (dateLine) rows.push({ label: 'Date & heure', value: dateLine, strikethrough: strike });
  }

  const nursingItems = getNursingItems(apt);
  const bloodItems = getBloodItems(apt);

  const titleNorm = (opts.titleContext ?? '').trim().toLowerCase();
  const careLabel = (value: string) => {
    const v = value.trim().toLowerCase();
    if (titleNorm && v === titleNorm) return;
    if (isNursingAppointment(apt.type) && nursingItems.length === 1) {
      rows.push({ label: 'Soins prévus', value });
    } else if (isBloodTestAppointment(apt.type) && bloodItems.length === 1) {
      rows.push({ label: 'Prestations', value });
    } else if (apt.category_name && nursingItems.length <= 1 && bloodItems.length <= 1) {
      rows.push({ label: 'Type de soin', value });
    }
  };

  if (isBloodTestAppointment(apt.type) && bloodItems.length === 1) {
    careLabel(itemLabel(bloodItems[0]));
  } else if (isNursingAppointment(apt.type) && nursingItems.length === 1) {
    careLabel(itemLabel(nursingItems[0]));
  } else if (apt.category_name && nursingItems.length <= 1 && bloodItems.length <= 1) {
    careLabel(apt.category_name);
  }

  if (isBloodTestAppointment(apt.type)) {
    const bt = getBloodTestTypeLabel(fd);
    if (bt) rows.push({ label: 'Type prélèvement', value: bt });
  }

  if (isNursingAppointment(apt.type)) {
    const dur = getNursingDurationLabel(String(fd.duration_days ?? ''), fd.custom_days as number | null);
    if (dur) rows.push({ label: 'Type de prise en charge', value: dur });
    const freq = fd.frequency != null && fd.frequency !== '' ? getFrequencyLabel(String(fd.frequency)) : '';
    if (freq) rows.push({ label: 'Fréquence', value: freq });
    const pref = getPreferredNurseGenderLabel(String(fd.preferred_nurse_gender ?? ''));
    if (pref && fd.preferred_nurse_gender && fd.preferred_nurse_gender !== 'any') {
      rows.push({ label: 'Préférence infirmier', value: pref });
    }
  } else if (fd.duration_days) {
    const dur = formatBloodTestSeriesDurationDays(String(fd.duration_days), fd.custom_days as number | null);
    if (dur) rows.push({ label: 'Durée', value: dur });
  }

  nursingItems.forEach((item, idx) => {
    if (nursingItems.length > 1) {
      rows.push({
        label: `Soins prévus #${idx + 1}`,
        value: itemLabel(item),
      });
    }
  });

  bloodItems.forEach((item, idx) => {
    if (bloodItems.length > 1) {
      rows.push({
        label: `Prestations #${idx + 1}`,
        value: itemLabel(item),
      });
    }
  });

  const notes = getAppointmentNotes(apt);
  if (notes) rows.push({ label: 'Message', value: notes });

  const ext = apt as unknown as Record<string, unknown>;
  if (!opts.hideCreatedAt && ext.created_at) {
    rows.push({
      label: 'Créé le',
      value: dayjs(String(ext.created_at)).format('D MMMM YYYY à HH:mm'),
    });
  }

  return rows;
}

export function formatAppointmentCreatedAtMeta(apt: Appointment): string | null {
  const ext = apt as unknown as Record<string, unknown>;
  if (!ext.created_at) return null;
  const d = dayjs(String(ext.created_at));
  return d.isValid() ? `Créé le ${d.format('D MMM YYYY à HH:mm')}` : null;
}

export function patientDisplayName(apt: Appointment): string {
  const rel = (apt as Appointment & { relative?: { first_name?: string; last_name?: string } }).relative;
  if (rel) {
    return `${rel.first_name ?? ''} ${rel.last_name ?? ''}`.trim();
  }
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  return `${fd.first_name ?? ''} ${fd.last_name ?? ''}`.trim();
}

export function bookingContactName(apt: Appointment): string {
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  return `${fd.booking_contact_first_name ?? fd.account_holder_first_name ?? fd.first_name ?? ''} ${fd.booking_contact_last_name ?? fd.account_holder_last_name ?? fd.last_name ?? ''}`.trim();
}
