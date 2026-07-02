import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import {
  formatCareOptionRows,
} from '~/utils/tour-stop-care-options';
import type { CareCategoryRowMinimal } from '~/utils/care-icons';
import { patientRdvCatalogDisplayLines } from '~/utils/patient-rdv-list-display';

export function tourStopAsAppointment(stop: NurseTourStop): Record<string, unknown> {
  const fd: Record<string, unknown> = {};
  if (stop.availability != null) fd.availability = stop.availability;
  if (stop.care_options && Object.keys(stop.care_options).length > 0) {
    fd.care_options = stop.care_options;
  } else {
    const firstItem = stop.nursing_items?.[0] as Record<string, unknown> | undefined;
    const itemOptions = firstItem?.care_options;
    if (itemOptions && typeof itemOptions === 'object' && Object.keys(itemOptions as object).length > 0) {
      fd.care_options = itemOptions;
    }
  }

  const nursingDisplay =
    stop.nursing_items_display?.length
      ? stop.nursing_items_display
      : stop.nursing_items?.length
        ? stop.nursing_items
        : undefined;

  return {
    id: stop.appointment_id,
    type: stop.type ?? 'nursing',
    status: stop.status,
    scheduled_at: stop.scheduled_at,
    category_id: stop.category_id,
    category_name: stop.category_name,
    category_icon: stop.category_icon,
    category_image_url: stop.category_image_url,
    creation_batch_id: stop.creation_batch_id,
    form_data: fd,
    nursing_items: stop.nursing_items,
    nursing_items_display: nursingDisplay,
  };
}

export function tourStopLotSummaryLabel(stop: NurseTourStop): string {
  const n = stop.batch_sibling_count ?? 0;
  if (n <= 1) return '';
  return 'Rendez-vous multiple';
}

export function tourStopCatalogLines(stop: NurseTourStop) {
  return patientRdvCatalogDisplayLines(tourStopAsAppointment(stop), { badgeCategoryOnly: true });
}

export function tourStopCareOptionRows(
  stop: NurseTourStop,
  categories: CareCategoryRowMinimal[],
): Array<{ label: string; value: string }> {
  const apt = tourStopAsAppointment(stop);
  const rows: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();

  const items =
    (Array.isArray(apt.nursing_items_display) && apt.nursing_items_display.length
      ? apt.nursing_items_display
      : Array.isArray(apt.nursing_items)
        ? apt.nursing_items
        : []) as Array<Record<string, unknown>>;

  for (const item of items) {
    const catId = item.category_id != null ? String(item.category_id) : '';
    const cat = categories.find((c) => String(c.id) === catId);
    const co = item.care_options as Record<string, string | number> | undefined;
    for (const row of formatCareOptionRows(cat, co)) {
      const key = `${row.label}|${row.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }

  const fd = apt.form_data as { care_options?: Record<string, string | number> } | undefined;
  if (items.length === 0 && fd?.care_options) {
    const catId = apt.category_id != null ? String(apt.category_id) : '';
    const cat = categories.find((c) => String(c.id) === catId);
    for (const row of formatCareOptionRows(cat, fd.care_options)) {
      const key = `${row.label}|${row.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }

  const hasTypeRow = rows.some((row) => {
    const label = row.label.trim().toLowerCase();
    return label === 'type' || label === 'type de soin';
  });
  if (!hasTypeRow && stop.category_name && (stop.type ?? 'nursing') === 'nursing' && items.length <= 1) {
    const value =
      items.length === 1
        ? String(items[0]?.label ?? items[0]?.category_name ?? stop.category_name).trim()
        : stop.category_name.trim();
    if (value) {
      rows.unshift({ label: 'Type', value });
    }
  }

  return rows;
}
