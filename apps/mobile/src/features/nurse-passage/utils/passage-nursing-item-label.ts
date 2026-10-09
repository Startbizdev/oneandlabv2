import { formatCareOptionRows } from '@/features/appointments/form/utils/selected-service-detail-lines';
import type { CareCategory } from '@/features/categories/api/categories.service';
import type { NursePassageNursingItem } from '@oneandlab/shared-types';
import { sortCareCategoriesForBooking } from '@oneandlab/shared-utils';

/** Libellé soin passage : nom catalogue + valeurs d’options (ex. Injection (Intramusculaire)). */
export function formatPassageNursingItemLabel(
  item: NursePassageNursingItem,
  categories: CareCategory[],
): string {
  const cat = categories.find((c) => String(c.id) === String(item.category_id));
  return buildPassageNursingItemLabel(cat, item.care_options);
}

export function hasPassageCareOptions(item: NursePassageNursingItem): boolean {
  return Boolean(item.care_options && Object.keys(item.care_options).length > 0);
}

/** Identité d'un soin : même catégorie avec des options différentes = deux soins distincts. */
export function passageNursingItemKey(item: NursePassageNursingItem): string {
  const options = item.care_options ?? {};
  const normalized = Object.keys(options)
    .sort()
    .map((k) => `${k}=${String(options[k])}`)
    .join('&');
  return `${item.category_id}|${normalized}`;
}

/** Ordre catalogue (« Autre » et certificat de décès en dernier). */
export function sortPassageNursingItems(
  items: NursePassageNursingItem[],
  categories: CareCategory[],
): NursePassageNursingItem[] {
  return sortCareCategoriesForBooking(
    items.map((item) => {
      const cat = categories.find((c) => String(c.id) === String(item.category_id));
      return { item, name: cat?.name, type: cat?.type, label: formatPassageNursingItemLabel(item, categories) };
    }),
  ).map(({ item }) => item);
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
