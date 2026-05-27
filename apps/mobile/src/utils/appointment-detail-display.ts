import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CANCELLATION_REASONS } from '@oneandlab/shared-constants';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { formatCareOptionRows } from '@/features/appointments/form/utils/selected-service-detail-lines';
import { appointmentAddressLine } from './appointment-address';
import { formatScheduledDateWithAvailabilityLineFr } from './appointment-datetime-fr';
import { resolveRdvCareDisplayLabel } from './rdv-care-display-label';

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

export function getAppointmentNursingItems(appt: Appointment): Array<Record<string, unknown>> {
  const ext = appt as Appointment & { nursing_items?: unknown; nursing_items_display?: unknown };
  const raw = ext.nursing_items_display ?? ext.nursing_items;
  const items = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
  if (appt.type !== 'nursing') return items;
  return filterItemsForAppt(appt, items);
}

export function appointmentHasMultipleCareLines(appt: Appointment): boolean {
  return getAppointmentNursingItems(appt).length > 1 || getAppointmentBloodItems(appt).length > 1;
}

export function getAppointmentBloodItems(appt: Appointment): Array<Record<string, unknown>> {
  const ext = appt as Appointment & { blood_test_items?: unknown };
  const raw = ext.blood_test_items;
  const items = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
  if (!isBloodTestAppointment(appt.type)) return items;
  return filterItemsForAppt(appt, items);
}

export function nursingItemDisplayLabel(item: Record<string, unknown>): string {
  const raw = String(item.label ?? item.category_name ?? '—').trim() || '—';
  return resolveRdvCareDisplayLabel(raw, parseItemCareOptions(item.care_options));
}

const GENERIC_CARE_ITEM_LABELS = new Set([
  'soin',
  'soins',
  'prestation',
  'prestations',
  'prélèvement',
  'prelevement',
  'analyse',
  'analyses',
  '—',
]);

/** Libellé affiché : nom catalogue si la ligne API est générique (« Prestation », etc.). */
export function resolveCareItemDisplayLabel(
  item: Record<string, unknown>,
  categories?: CareCategory[],
): string {
  const fromItem = nursingItemDisplayLabel(item);
  const norm = fromItem.trim().toLowerCase();
  if (norm && !GENERIC_CARE_ITEM_LABELS.has(norm)) return fromItem;

  const catId = item.category_id != null ? String(item.category_id) : '';
  const cat = catId && categories?.length ? categories.find((c) => String(c.id) === catId) : undefined;
  if (cat?.name?.trim()) {
    return resolveRdvCareDisplayLabel(cat.name.trim(), parseItemCareOptions(item.care_options));
  }

  const catName = String(item.category_name ?? '').trim();
  if (catName && !GENERIC_CARE_ITEM_LABELS.has(catName.toLowerCase())) {
    return resolveRdvCareDisplayLabel(catName, parseItemCareOptions(item.care_options));
  }

  return fromItem;
}

export function parseItemCareOptions(co: unknown): Record<string, string | number> {
  if (!co || typeof co !== 'object') return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(co as Record<string, unknown>)) {
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
  }
  return out;
}

const PER_ACT_NURSING_META_KEYS = new Set(['_duration_days', '_frequency', '_custom_days']);

function categoryForItem(
  item: Record<string, unknown>,
  categories: CareCategory[],
): CareCategory | undefined {
  const id = item.category_id != null ? String(item.category_id) : '';
  return id ? categories.find((c) => String(c.id) === id) : undefined;
}

export function nursingItemMetaDurationLabel(item: Record<string, unknown>): string {
  const o = parseItemCareOptions(item.care_options);
  const d = o._duration_days;
  if (d == null || d === '') return '';
  const cu = o._custom_days;
  const customNum =
    typeof cu === 'number' && !Number.isNaN(cu)
      ? cu
      : cu != null && String(cu).trim() !== ''
        ? Number(cu)
        : null;
  return getNursingDurationLabel(String(d), Number.isNaN(customNum as number) ? null : customNum);
}

export function nursingItemMetaFrequencyLabel(item: Record<string, unknown>): string {
  const o = parseItemCareOptions(item.care_options);
  const f = o._frequency;
  if (f == null || f === '') return '';
  return getFrequencyLabel(String(f));
}

export function nursingItemCareOptionTypeValue(
  item: Record<string, unknown>,
): string | number | null {
  const v = parseItemCareOptions(item.care_options).type;
  if (v == null || v === '') return null;
  return v;
}

/** Évite de répéter le type quand une seule entrée reflète déjà form_data.care_options.type. */
export function shouldShowNursingItemTypeRow(
  item: Record<string, unknown>,
  nursingItems: Array<Record<string, unknown>>,
  apt: Appointment,
): boolean {
  const iv = nursingItemCareOptionTypeValue(item);
  if (iv == null) return false;
  if (nursingItems.length > 1) return true;
  const raw = (apt.form_data as Record<string, unknown> | undefined)?.care_options;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
  const rv = (raw as Record<string, unknown>).type;
  if (rv == null || rv === '') return true;
  return String(iv) !== String(rv);
}

export function buildNursingItemTypeKvRow(
  item: Record<string, unknown>,
  categories: CareCategory[],
): DetailKvRow | null {
  const typeVal = nursingItemCareOptionTypeValue(item);
  if (typeVal == null) return null;
  const co = parseItemCareOptions(item.care_options);
  const cat = categoryForItem(item, categories);
  const typeOpt = cat?.options?.find((o) => o.option_key === 'type');
  const rows = formatCareOptionRows(cat, co);
  const row = typeOpt
    ? rows.find((r) => r.label === typeOpt.label)
    : rows.find((r) => r.value?.trim());
  return row ? { label: row.label, value: row.value } : null;
}

/** Options catalogue propres à l’acte (hors type, méta _duration_days, options communes). */
export function buildNursingItemPerActOptionKvRows(
  item: Record<string, unknown>,
  categories: CareCategory[],
  excludeKeys: Set<string> = new Set(),
): DetailKvRow[] {
  const co = parseItemCareOptions(item.care_options);
  const filtered: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(co)) {
    if (k === 'type' || PER_ACT_NURSING_META_KEYS.has(k) || excludeKeys.has(k)) {
      continue;
    }
    filtered[k] = v;
  }
  return formatCareOptionRows(categoryForItem(item, categories), filtered).map((r) => ({
    label: r.label,
    value: r.value,
  }));
}

export function buildNursingAppointmentFormMetaKvRows(apt: Appointment): DetailKvRow[] {
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const rows: DetailKvRow[] = [];
  const dur = getNursingDurationLabel(String(fd.duration_days ?? ''), fd.custom_days as number | null);
  if (dur) rows.push({ label: 'Type de prise en charge', value: dur });
  const freq =
    fd.frequency != null && fd.frequency !== '' ? getFrequencyLabel(String(fd.frequency)) : '';
  if (freq) rows.push({ label: 'Fréquence', value: freq });
  const pref = getPreferredNurseGenderLabel(String(fd.preferred_nurse_gender ?? ''));
  if (pref && fd.preferred_nurse_gender && fd.preferred_nurse_gender !== 'any') {
    rows.push({ label: 'Préférence infirmier', value: pref });
  }
  return rows;
}

/** Options catalogue par acte / form_data (localisation, type de soin, etc.). */
export function buildAppointmentCareOptionKvRows(
  apt: Appointment,
  categories: CareCategory[],
  opts: { excludeKeys?: Set<string> } = {},
): DetailKvRow[] {
  const rows: DetailKvRow[] = [];
  const exclude = opts.excludeKeys ?? new Set<string>();
  let anyItemOptions = false;

  for (const item of getAppointmentNursingItems(apt)) {
    const co = parseItemCareOptions(item.care_options);
    if (Object.keys(co).length > 0) anyItemOptions = true;
    const filtered: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(co)) {
      if (!exclude.has(k)) filtered[k] = v;
    }
    for (const row of formatCareOptionRows(categoryForItem(item, categories), filtered)) {
      rows.push({ label: row.label, value: row.value });
    }
  }

  for (const item of getAppointmentBloodItems(apt)) {
    const co = parseItemCareOptions(item.care_options);
    if (Object.keys(co).length > 0) anyItemOptions = true;
    const filtered: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(co)) {
      if (!exclude.has(k)) filtered[k] = v;
    }
    for (const row of formatCareOptionRows(categoryForItem(item, categories), filtered)) {
      rows.push({ label: row.label, value: row.value });
    }
  }

  if (!anyItemOptions && isNursingAppointment(apt.type)) {
    const fd = (apt.form_data ?? {}) as Record<string, unknown>;
    const co = parseItemCareOptions(fd.care_options);
    const cat = apt.category_id
      ? categories.find((c) => String(c.id) === String(apt.category_id))
      : undefined;
    for (const row of formatCareOptionRows(cat, co)) {
      rows.push({ label: row.label, value: row.value });
    }
  }

  return rows;
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
    /** Lot multi-RDV : durée, fréquence, préférence, type prélèvement (affichés une fois au pied) */
    hideLotWideFields?: boolean;
    hideNotes?: boolean;
    /** Catalogue soins : libellés d’options (localisation, type, etc.) */
    categories?: CareCategory[];
    /** Lot : ne pas répéter les options identiques sur chaque acte */
    excludeCareOptionKeys?: Set<string>;
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

  const nursingItems = getAppointmentNursingItems(apt);
  const bloodItems = getAppointmentBloodItems(apt);

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
    careLabel(nursingItemDisplayLabel(bloodItems[0]));
  } else if (isNursingAppointment(apt.type) && nursingItems.length === 1) {
    careLabel(nursingItemDisplayLabel(nursingItems[0]));
  } else if (apt.category_name && nursingItems.length <= 1 && bloodItems.length <= 1) {
    careLabel(apt.category_name);
  }

  nursingItems.forEach((item, idx) => {
    if (nursingItems.length > 1) {
      rows.push({
        label: `Soins prévus #${idx + 1}`,
        value: nursingItemDisplayLabel(item),
      });
    }
  });

  bloodItems.forEach((item, idx) => {
    if (bloodItems.length > 1) {
      rows.push({
        label: `Prestations #${idx + 1}`,
        value: nursingItemDisplayLabel(item),
      });
    }
  });

  if (opts.categories?.length) {
    rows.push(
      ...buildAppointmentCareOptionKvRows(apt, opts.categories, {
        excludeKeys: opts.excludeCareOptionKeys,
      }),
    );
  }

  if (!opts.hideLotWideFields) {
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
  }

  if (!opts.hideNotes) {
    const notes = getAppointmentNotes(apt);
    if (notes) rows.push({ label: 'Message', value: notes });
  }

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
