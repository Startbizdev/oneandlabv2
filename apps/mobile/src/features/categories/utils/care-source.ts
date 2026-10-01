/**
 * Soin à illustrer : l'image importée par l'admin (`care_categories.image_url`) prime ; sinon le nom désigne
 * l'illustration 3D (`careArtworkKey`), le type servant de repli pour une catégorie inconnue.
 */
export type CareSource = {
  name?: string | null;
  type?: string | null;
  image_url?: string | null;
};

/** Soin d'un acte de RDV : le nom de la catégorie du catalogue prime sur le libellé dénormalisé du RDV. */
export function careSourceFromCatalog(
  item: { categoryId?: string | null; name: string },
  appointmentType: string,
  categories: readonly { id: string; name: string; image_url?: string | null }[] | undefined,
): CareSource {
  const cat = item.categoryId ? categories?.find((c) => c.id === item.categoryId) : undefined;
  return { name: cat?.name ?? item.name, type: appointmentType, image_url: cat?.image_url };
}
