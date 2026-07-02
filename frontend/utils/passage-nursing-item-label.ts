import type { NursePassageNursingItem } from '@oneandlab/shared-types';
import { formatCareOptionRows } from '~/utils/tour-stop-care-options';

type CareCategoryLike = {
  id: string;
  name?: string;
  label?: string;
  options?: Array<{
    option_key: string;
    label: string;
    field_type?: string;
    sort_order?: number;
    options?: Array<{ value: string; label: string }>;
  }>;
};

export function buildPassageNursingItemLabel(
  cat: CareCategoryLike | undefined,
  careOptions?: Record<string, string | number>,
): string {
  const base = cat?.name?.trim() || cat?.label?.trim() || 'Soin';
  if (!cat?.options?.length || !careOptions) return base;
  const rows = formatCareOptionRows(cat, careOptions);
  const values = [...new Set(rows.map((r) => r.value).filter(Boolean))];
  if (values.length === 0) return base;
  return `${base} (${values.join(', ')})`;
}

export function formatPassageNursingItemLabel(
  item: NursePassageNursingItem,
  categories: CareCategoryLike[],
): string {
  const cat = categories.find((c) => String(c.id) === String(item.category_id));
  return buildPassageNursingItemLabel(cat, item.care_options);
}
