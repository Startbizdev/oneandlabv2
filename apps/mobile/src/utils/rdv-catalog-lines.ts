import type { Appointment } from '@oneandlab/shared-types';
import {
  filterRdvCatalogLinesForPatientViewer,
  isBloodTestAppointment,
  isNursingAppointment,
} from '@oneandlab/shared-utils';
import { careEmojiForCareItem, careEmojiForLabel } from '@/utils/care-category-display';
import { isAutreCareDisplayLabel, resolveRdvCareDisplayLabel, careCatalogBadgeBaseLabel } from '@/utils/rdv-care-display-label';

export type RdvCatalogLine = {
  category_id: string | null;
  label: string;
  /** Emoji affiché dans les mini-tags liste RDV. */
  emoji: string;
  category_image_url?: string | null;
  care_options?: Record<string, string | number>;
};

type ItemRow = {
  label?: string;
  category_name?: string;
  category_id?: string;
  category_icon?: string | null;
  category_image_url?: string | null;
  care_options?: Record<string, unknown>;
};

type AptWithIcon = Appointment & { category_icon?: string | null };

function mapCareOptions(raw: unknown): Record<string, string | number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === '' || v === undefined || v === null) continue;
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function mapItem(
  it: ItemRow,
  fallbackLabel: string,
  apt: Appointment,
  opts?: RdvCatalogDisplayOpts,
): RdvCatalogLine {
  const rawLabel = String(it?.label ?? it?.category_name ?? fallbackLabel).trim() || fallbackLabel;
  const careOpts = mapCareOptions(it?.care_options);
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const fdCareOpts = mapCareOptions(fd.care_options);
  const labelSource = opts?.badgeCategoryOnly
    ? careCatalogBadgeBaseLabel(rawLabel, it?.category_name, fallbackLabel)
    : rawLabel;
  const label = resolveRdvCareDisplayLabel(
    labelSource,
    careOpts,
    isAutreCareDisplayLabel(labelSource) ? fdCareOpts : undefined,
  );
  const categoryId = it?.category_id != null ? String(it.category_id) : null;
  const emojiSource = isAutreCareDisplayLabel(rawLabel) ? rawLabel : label;

  return {
    category_id: categoryId,
    label,
    emoji: careEmojiForCareItem(it, apt.type, undefined, emojiSource),
    category_image_url: it?.category_image_url ?? apt.category_image_url ?? null,
    care_options: mapCareOptions(it?.care_options),
  };
}

export type RdvCatalogDisplayOpts = {
  /** Masque certificat de décès et autres actes staff-only (vue patient). */
  hideStaffOnlyCares?: boolean;
  /** Badges tournée : catégorie seule (options affichées en dessous). */
  badgeCategoryOnly?: boolean;
};

function finalizeRdvCatalogLines(
  lines: RdvCatalogLine[],
  opts?: RdvCatalogDisplayOpts,
): RdvCatalogLine[] {
  return opts?.hideStaffOnlyCares ? filterRdvCatalogLinesForPatientViewer(lines) : lines;
}

/** Lignes catalogue pour carte liste (aligné `patientRdvCatalogDisplayLines` web). */
export function rdvCatalogDisplayLines(apt: Appointment, opts?: RdvCatalogDisplayOpts): RdvCatalogLine[] {
  if (!apt) {
    return [{ category_id: null, label: 'Rendez-vous', emoji: '📋' }];
  }
  const t = apt.type;
  if (isBloodTestAppointment(t)) {
    const ext = apt as Appointment & {
      blood_test_items?: ItemRow[];
      blood_test_items_display?: ItemRow[];
    };
    const raw =
      ext.blood_test_items_display?.length
        ? ext.blood_test_items_display
        : ext.blood_test_items ?? [];
    if (raw.length > 0) {
      return finalizeRdvCatalogLines(
        raw.map((it) => mapItem(it, apt.category_name ?? 'Analyse', apt, opts)),
        opts,
      );
    }
  }
  if (isNursingAppointment(t)) {
    const ext = apt as Appointment & {
      nursing_items?: ItemRow[];
      nursing_items_display?: ItemRow[];
    };
    const raw =
      ext.nursing_items_display?.length
        ? ext.nursing_items_display
        : ext.nursing_items ?? [];
    if (raw.length > 0) {
      return finalizeRdvCatalogLines(raw.map((it) => mapItem(it, 'Soin', apt, opts)), opts);
    }
  }
  const catId = apt.category_id != null ? String(apt.category_id) : null;
  const rawLabel = String(apt.category_name ?? '').trim();
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const fdCareOpts = mapCareOptions(fd.care_options);
  const fallback = isBloodTestAppointment(t) ? 'Prélèvement' : 'Soin';
  const singleLabel = resolveRdvCareDisplayLabel(
    rawLabel || fallback,
    fdCareOpts,
    isAutreCareDisplayLabel(rawLabel) ? fdCareOpts : undefined,
  );
  const ext = apt as AptWithIcon;
  const emojiSource = isAutreCareDisplayLabel(rawLabel) ? rawLabel || 'Autre' : singleLabel;
  return finalizeRdvCatalogLines(
    [
      {
        category_id: catId,
        label: singleLabel,
        emoji: careEmojiForLabel(emojiSource, t, {
          categoryId: catId,
          categoryIcon: ext.category_icon ?? null,
        }),
        category_image_url: apt.category_image_url ?? null,
        care_options: fdCareOpts,
      },
    ],
    opts,
  );
}
