import {
  NURSING_FREQUENCY_OPTIONS,
  getNursingDurationLabel,
  showNursingFrequency,
  formatCareSelectValueWithAutreDetail,
  isCareAutreDetailKey,
} from '@oneandlab/shared-constants';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import type { BookingServiceFormSlice } from './booking-service-form-slice';

const MULTIPLE_DAYS_LABELS: Record<string, string> = {
  '2': '2 jours',
  '3': '3 jours',
  '5': '5 jours',
  '7': '7 jours',
  '10': '10 jours',
  '15': '15 jours',
  custom: 'Durée personnalisée',
};

function frequencyLabel(v: string | undefined): string {
  if (!v) return '';
  return NURSING_FREQUENCY_OPTIONS.find((x) => x.value === v)?.label ?? v;
}

function genderLabel(v: string | undefined): string {
  if (v === 'female') return 'Infirmière';
  if (v === 'male') return 'Infirmier';
  return 'Indifférent';
}

function formatCareOptionRows(
  cat: CareCategory | undefined,
  co: Record<string, string | number> | undefined,
): Array<{ label: string; value: string }> {
  if (!cat?.options?.length || !co) return [];
  const rows: Array<{ label: string; value: string }> = [];
  for (const opt of [...cat.options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (isCareAutreDetailKey(opt.option_key)) continue;
    const raw = co[opt.option_key];
    if (raw === '' || raw === undefined || raw === null) continue;
    if (opt.field_type === 'select') {
      const choice = opt.options?.find((o) => String(o.value) === String(raw));
      const baseLabel = choice?.label ?? String(raw);
      const display = formatCareSelectValueWithAutreDetail(
        baseLabel,
        opt.option_key,
        raw,
        co as Record<string, unknown>,
      );
      rows.push({ label: opt.label, value: display });
    } else {
      rows.push({ label: opt.label, value: String(raw) });
    }
  }
  return rows;
}

/** Aligné SelectedServicesCartSummary.detailLinesFor (web). */
export function detailLinesForSelectedService(
  svc: SelectedServiceInput,
  categories: CareCategory[],
  formDataByService?: Record<string, BookingServiceFormSlice | undefined> | null,
): Array<{ label: string; value: string }> {
  const slice = formDataByService?.[svc.id];
  const cat = categories.find((c) => String(c.id) === String(svc.category_id ?? svc.id));

  if (!slice) {
    return formatCareOptionRows(cat, undefined);
  }

  const rows: Array<{ label: string; value: string }> = [];

  if (isBloodTestAppointment(svc.type)) {
    if (slice.blood_test_type === 'single') {
      rows.push({ label: 'Prélèvement', value: 'Une seule fois' });
    } else if (slice.blood_test_type === 'multiple') {
      rows.push({ label: 'Prélèvement', value: 'Sur plusieurs jours' });
      if (slice.duration_days === 'custom' && slice.custom_days != null && slice.custom_days > 0) {
        rows.push({ label: 'Durée', value: `${slice.custom_days} jours` });
      } else if (slice.duration_days && slice.duration_days !== 'custom') {
        rows.push({
          label: 'Durée',
          value: MULTIPLE_DAYS_LABELS[slice.duration_days] ?? `${slice.duration_days} jours`,
        });
      }
    }
  }

  if (isNursingAppointment(svc.type)) {
    const dur = getNursingDurationLabel(slice.duration_days, slice.custom_days ?? null);
    if (dur) rows.push({ label: 'Prise en charge', value: dur });
    if (showNursingFrequency(slice.duration_days)) {
      const fq = frequencyLabel(slice.frequency);
      if (fq) rows.push({ label: 'Fréquence', value: fq });
    }
    rows.push({ label: 'Préférence', value: genderLabel(slice.preferred_nurse_gender) });
  }

  rows.push(...formatCareOptionRows(cat, slice.care_options));
  return rows;
}

export function selectionHeadline(count: number): string {
  if (count <= 1) return 'Soin sélectionné';
  return 'Soins sélectionnés';
}

export function selectionDetailActionLabel(count: number): string {
  if (count <= 0) return 'Aucun soin';
  if (count === 1) return 'Voir le détail du soin';
  return 'Détails des soins';
}

export function selectionModalTitle(count: number): string {
  if (count <= 1) return 'Votre soin';
  return `Vos ${count} soins`;
}
