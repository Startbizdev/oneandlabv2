import { formatCareOptionRows } from '@/features/appointments/form/utils/selected-service-detail-lines';
import type { CareCategory } from '@/features/categories/api/categories.service';
import type { NursePassageNursingItem } from '@oneandlab/shared-types';

/** Libellé soin passage : nom catalogue + valeurs d’options (ex. Injection (Intramusculaire)). */
export function formatPassageNursingItemLabel(
  item: NursePassageNursingItem,
  categories: CareCategory[],
): string {
  const cat = categories.find((c) => String(c.id) === String(item.category_id));
  return buildPassageNursingItemLabel(cat, item.care_options);
}

export function buildPassageNursingItemLabel(
  cat: CareCategory | undefined,
  careOptions?: Record<string, string | number>,
): string {
  const base = cat?.name?.trim() || cat?.label?.trim() || 'Soin';
  if (!cat?.options?.length || !careOptions) return base;

  const rows = formatCareOptionRows(cat, careOptions);
  const values = [...new Set(rows.map((r) => r.value).filter(Boolean))];
  if (values.length === 0) return base;

  return `${base} (${values.join(', ')})`;
}
