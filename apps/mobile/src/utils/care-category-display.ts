import type { Appointment } from '@oneandlab/shared-types';
import { careCategoryEmojiForCategory } from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';

type AptWithIcon = Appointment & { category_icon?: string | null };

/** Emoji pour un libellé de soin (BDD `icon`, catalogue par nom, ou heuristique). */
export function careEmojiForLabel(
  label: string,
  appointmentType: string,
  options?: {
    categoryId?: string | null;
    categoryIcon?: string | null;
    categories?: CareCategory[];
  },
): string {
  const name = String(label ?? '').trim();
  const catId = options?.categoryId;
  const fromCatalog =
    catId != null && options?.categories?.length
      ? options.categories.find((c) => String(c.id) === String(catId))
      : options?.categories?.find(
          (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
        );

  const catalogIcon = fromCatalog?.icon ?? null;
  const aptIcon =
    options?.categoryIcon != null && String(options.categoryIcon).trim() !== ''
      ? String(options.categoryIcon).trim()
      : null;
  // Ne pas réutiliser l’icône du RDV principal pour un autre `category_id` (lots multi-soins).
  const icon =
    catId != null && fromCatalog
      ? catalogIcon ?? aptIcon
      : aptIcon ?? catalogIcon;

  return careCategoryEmojiForCategory({
    name: fromCatalog?.name ?? name,
    icon,
    type: fromCatalog?.type ?? appointmentType,
  });
}

type CareItemRow = Record<string, unknown> & {
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  label?: string | null;
};

/** Emoji catalogue par acte (`nursing_items` / `blood_test_items`), pas l’icône du RDV parent. */
export function careEmojiForCareItem(
  item: CareItemRow,
  appointmentType: string,
  categories?: CareCategory[],
  fallbackLabel?: string,
): string {
  const catId = item.category_id != null ? String(item.category_id) : '';
  const fromCatalog = catId
    ? categories?.find((c) => String(c.id) === catId)
    : undefined;
  const name = String(
    fromCatalog?.name ?? item.category_name ?? item.label ?? fallbackLabel ?? '',
  ).trim();
  const itemIcon =
    item.category_icon != null && String(item.category_icon).trim() !== ''
      ? String(item.category_icon)
      : null;

  return careCategoryEmojiForCategory({
    name,
    icon: itemIcon ?? fromCatalog?.icon ?? null,
    type: fromCatalog?.type ?? appointmentType,
  });
}

export function careEmojiForAppointment(
  apt: Appointment,
  careName: string,
  categories?: CareCategory[],
  categoryId?: string | null,
): string {
  const ext = apt as AptWithIcon;
  return careEmojiForLabel(careName, apt.type, {
    categoryId: categoryId ?? apt.category_id ?? null,
    categoryIcon: ext.category_icon ?? null,
    categories,
  });
}
