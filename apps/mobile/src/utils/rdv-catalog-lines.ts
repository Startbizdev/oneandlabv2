import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';

export type RdvCatalogLine = {
  category_id: string | null;
  label: string;
};

/** Lignes catalogue pour carte liste (aligné `patientRdvCatalogDisplayLines` web). */
export function rdvCatalogDisplayLines(apt: Appointment): RdvCatalogLine[] {
  if (!apt) return [{ category_id: null, label: 'Rendez-vous' }];
  const t = apt.type;
  if (isBloodTestAppointment(t)) {
    const ext = apt as Appointment & {
      blood_test_items?: Array<{ label?: string; category_name?: string; category_id?: string }>;
      blood_test_items_display?: Array<{ label?: string; category_name?: string; category_id?: string }>;
    };
    const raw =
      ext.blood_test_items_display?.length
        ? ext.blood_test_items_display
        : ext.blood_test_items ?? [];
    if (raw.length > 0) {
      return raw.map((it) => ({
        category_id: it?.category_id != null ? String(it.category_id) : null,
        label:
          String(it?.label ?? it?.category_name ?? apt.category_name ?? 'Analyse').trim() ||
          'Analyse',
      }));
    }
  }
  if (isNursingAppointment(t)) {
    const ext = apt as Appointment & {
      nursing_items?: Array<{ label?: string; category_name?: string; category_id?: string }>;
      nursing_items_display?: Array<{ label?: string; category_name?: string; category_id?: string }>;
    };
    const raw =
      ext.nursing_items_display?.length
        ? ext.nursing_items_display
        : ext.nursing_items ?? [];
    if (raw.length > 0) {
      return raw.map((it) => ({
        category_id: it?.category_id != null ? String(it.category_id) : null,
        label: String(it?.label ?? it?.category_name ?? '').trim() || 'Soin',
      }));
    }
  }
  const catId = apt.category_id != null ? String(apt.category_id) : null;
  const label = String(apt.category_name ?? '').trim();
  return [
    {
      category_id: catId,
      label: label || (isBloodTestAppointment(t) ? 'Prélèvement' : 'Soin'),
    },
  ];
}
