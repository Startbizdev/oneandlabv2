import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { formatCareOptionRows } from '@/features/appointments/form/utils/selected-service-detail-lines';
import {
  type DetailKvRow,
  buildAppointmentDetailKvRows,
  getAppointmentNursingItems,
  parseItemCareOptions,
  getAppointmentNotes,
  getBloodTestTypeLabel,
  getFrequencyLabel,
  getNursingDurationLabel,
  getPreferredNurseGenderLabel,
  nursingItemDisplayLabel,
} from './appointment-detail-display';

function categoryForItem(
  item: Record<string, unknown>,
  categories: CareCategory[],
): CareCategory | undefined {
  const id = item.category_id != null ? String(item.category_id) : '';
  return id ? categories.find((c) => String(c.id) === id) : undefined;
}

function careOptionDisplay(
  optionKey: string,
  value: unknown,
  item: Record<string, unknown>,
  categories: CareCategory[],
): string {
  const co = { [optionKey]: value } as Record<string, string | number>;
  const rows = formatCareOptionRows(categoryForItem(item, categories), co);
  const row = rows.find((r) => r.label);
  return row?.value ?? String(value ?? '');
}

function careOptionEntries(item: Record<string, unknown>): Map<string, unknown> {
  const co = parseItemCareOptions(item.care_options);
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(co)) {
    if (v !== '' && v != null) m.set(k, v);
  }
  return m;
}

/** Tous les actes infirmiers du lot (pour options communes identiques). */
export function collectLotNursingItems(
  primary: Appointment,
  batch: Appointment[],
): Array<Record<string, unknown>> {
  const ext = primary as Appointment & {
    nursing_items_display?: unknown;
    nursing_items?: unknown;
  };
  const disp = ext.nursing_items_display ?? ext.nursing_items;
  if (Array.isArray(disp) && disp.length > 1) {
    return disp as Array<Record<string, unknown>>;
  }
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const apt of batch) {
    for (const item of getAppointmentNursingItems(apt)) {
      const key = `${String(item.category_id ?? '')}|${nursingItemDisplayLabel(item)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** Clés d’options strictement identiques sur tous les actes → une ligne commune (aligné web). */
export function nursingSharedOptionKeys(
  items: Array<Record<string, unknown>>,
  categories: CareCategory[],
): Set<string> {
  if (items.length <= 1) return new Set();
  const perItem = items.map((item) => careOptionEntries(item));
  const first = perItem[0]!;
  const shared = new Set<string>();

  for (const key of first.keys()) {
    const v0 = careOptionDisplay(key, first.get(key), items[0]!, categories);
    let allMatch = true;
    for (let i = 1; i < perItem.length; i++) {
      const mi = perItem[i]!;
      if (!mi.has(key)) {
        allMatch = false;
        break;
      }
      const vi = careOptionDisplay(key, mi.get(key), items[i]!, categories);
      if (vi !== v0) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) shared.add(key);
  }
  return shared;
}

/** Options métier strictement identiques sur tous les actes → une ligne commune. */
export function buildNursingSharedIdenticalKvRows(
  items: Array<Record<string, unknown>>,
  categories: CareCategory[],
): DetailKvRow[] {
  const sharedKeys = nursingSharedOptionKeys(items, categories);
  if (!sharedKeys.size) return [];
  const rows: DetailKvRow[] = [];
  const first = items[0]!;
  const co = careOptionEntries(first);
  for (const key of sharedKeys) {
    const val = co.get(key);
    if (val == null || val === '') continue;
    const optionRows = formatCareOptionRows(categoryForItem(first, categories), {
      [key]: val as string | number,
    });
    const label = optionRows[0]?.label ?? key;
    const value = optionRows[0]?.value ?? careOptionDisplay(key, val, first, categories);
    rows.push({ label, value });
  }
  return rows;
}

/** Champs communs au RDV / lot (durée, fréquence, préférence, options partagées, message). */
export function buildBatchLotCommonKvRows(
  primary: Appointment,
  batch: Appointment[],
  categories: CareCategory[],
): DetailKvRow[] {
  const rows: DetailKvRow[] = [];
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;

  if (isNursingAppointment(primary.type)) {
    const lotItems = collectLotNursingItems(primary, batch);
    rows.push(...buildNursingSharedIdenticalKvRows(lotItems, categories));

    const dur = getNursingDurationLabel(String(fd.duration_days ?? ''), fd.custom_days as number | null);
    if (dur) rows.push({ label: 'Type de prise en charge', value: dur });
    const freq =
      fd.frequency != null && fd.frequency !== '' ? getFrequencyLabel(String(fd.frequency)) : '';
    if (freq) rows.push({ label: 'Fréquence', value: freq });
    const pref = getPreferredNurseGenderLabel(String(fd.preferred_nurse_gender ?? ''));
    if (pref && fd.preferred_nurse_gender && fd.preferred_nurse_gender !== 'any') {
      rows.push({ label: 'Préférence infirmier', value: pref });
    }

  }

  if (isBloodTestAppointment(primary.type)) {
    const bt = getBloodTestTypeLabel(fd);
    if (bt) rows.push({ label: 'Type prélèvement', value: bt });
  }

  const notes = getAppointmentNotes(primary);
  if (notes) rows.push({ label: 'Message', value: notes });

  return rows;
}

/** Détail d’un acte dans un lot (date, soin, options propres à l’acte). */
export function buildBatchPerActKvRows(
  apt: Appointment,
  categories: CareCategory[],
  sharedKeys: Set<string>,
  opts: {
    showSchedule?: boolean;
    titleContext?: string | null;
  } = {},
): DetailKvRow[] {
  return buildAppointmentDetailKvRows(apt, {
    hideAddress: true,
    hideScheduledDate: !opts.showSchedule,
    hideCreatedAt: true,
    hideLotWideFields: true,
    hideNotes: true,
    titleContext: opts.titleContext,
    categories,
    excludeCareOptionKeys: sharedKeys,
  });
}

export function detailKvRowsToStackItems(rows: DetailKvRow[]) {
  return rows
    .filter((r) => r.value)
    .map((r) => ({
      label: r.label,
      value: r.value,
      muted: Boolean(r.strikethrough),
    }));
}
