/** Champs utilisés pour trier les catégories à l’étape 1 de prise de RDV. */
export type BookingCareSortable = {
  name?: string | null;
  label?: string | null;
  type?: string | null;
};

function normalizeBookingCareText(value: string | null | undefined): string {
  const raw = value != null ? String(value).trim() : '';
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function careSortText(cat: BookingCareSortable): string {
  const label = normalizeBookingCareText(cat.label);
  const name = normalizeBookingCareText(cat.name);
  return [label, name].filter(Boolean).join(' ') || label || name;
}

/** Catégorie fourre-tout « Autre » — toujours en dernier. */
export function isAutreBookingCareCategory(cat: BookingCareSortable): boolean {
  const label = normalizeBookingCareText(cat.label);
  const name = normalizeBookingCareText(cat.name);
  return label === 'autre' || name === 'autre' || /^autre\b/.test(label) || /^autre\b/.test(name);
}

/**
 * Rang d’affichage (0–16) pour la grille soins / prise de RDV.
 * Aligné sur l’ordre produit : Pansements → … → Bilan prévention.
 */
export function getBookingCareDisplayRank(cat: BookingCareSortable): number {
  if (isAutreBookingCareCategory(cat)) return 10_000;

  const text = careSortText(cat);
  const type = normalizeBookingCareText(cat.type);

  if (type === 'blood_test') return 2;
  if (/prise.{0,12}sang/.test(text)) return 2;

  const rules: ReadonlyArray<{ rank: number; pattern: RegExp }> = [
    { rank: 0, pattern: /pansement/ },
    { rank: 1, pattern: /injection/ },
    { rank: 3, pattern: /perfusion/ },
    { rank: 4, pattern: /hygiene|toilette/ },
    { rank: 5, pattern: /diab/ },
    { rank: 6, pattern: /traitement|pilulier/ },
    { rank: 7, pattern: /post[- ]?hospital/ },
    { rank: 8, pattern: /retrait|agraffe|points/ },
    { rank: 9, pattern: /vaccin/ },
    { rank: 10, pattern: /sonde urinaire|sonde(?!.*respir)/ },
    { rank: 11, pattern: /respiratoire/ },
    { rank: 12, pattern: /stomie/ },
    { rank: 13, pattern: /palliatif/ },
    { rank: 14, pattern: /surveillance constante|^surveillance$/ },
    { rank: 15, pattern: /certificat|deces/ },
    { rank: 16, pattern: /bilan.*prevention|mon bilan/ },
  ];

  for (const { rank, pattern } of rules) {
    if (pattern.test(text)) return rank;
  }

  return 9_000;
}

/** Tri stable : ordre produit, puis libellé FR, « Autre » en dernier. */
export function sortCareCategoriesForBooking<T extends BookingCareSortable>(
  categories: readonly T[],
): T[] {
  return [...categories].sort((a, b) => {
    const ra = getBookingCareDisplayRank(a);
    const rb = getBookingCareDisplayRank(b);
    if (ra !== rb) return ra - rb;
    const la = String(a.label ?? a.name ?? '');
    const lb = String(b.label ?? b.name ?? '');
    return la.localeCompare(lb, 'fr', { sensitivity: 'base' });
  });
}
