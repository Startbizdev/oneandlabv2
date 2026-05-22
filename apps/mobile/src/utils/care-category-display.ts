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

  return careCategoryEmojiForCategory({
    name: fromCatalog?.name ?? name,
    icon: options?.categoryIcon ?? fromCatalog?.icon ?? null,
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
