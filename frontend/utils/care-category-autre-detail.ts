/** Détail libre quand un select catalogue vaut `autre` / `other`. */
export const CARE_AUTRE_DETAIL_SUFFIX = '__autre_detail';

export function careAutreDetailKey(optionKey: string): string {
  return `${optionKey}${CARE_AUTRE_DETAIL_SUFFIX}`;
}

export function isCareAutreDetailKey(key: string): boolean {
  return key.endsWith(CARE_AUTRE_DETAIL_SUFFIX);
}

export function isAutreSelectValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
  return s === 'autre' || s === 'other';
}

export function categorySelectHasAutreOption(opt: {
  field_type?: string;
  options?: { value: string; label: string }[] | null;
}): boolean {
  if (opt.field_type !== 'select' || !opt.options?.length) return false;
  return opt.options.some((o) => isAutreSelectValue(o?.value));
}

/**
 * Affichage d’un select catalogue : si la valeur est « autre » / « other » et qu’une précision
 * est saisie, on affiche uniquement cette précision (évite « Autre — … » redondant en fiche RDV / modales).
 */
export function formatCareSelectValueWithAutreDetail(
  catalogLabel: string,
  optionKey: string,
  value: unknown,
  careOptions: Record<string, unknown> | null | undefined,
): string {
  if (!isAutreSelectValue(value) || !careOptions) return catalogLabel;
  const raw = careOptions[careAutreDetailKey(optionKey)];
  if (raw == null) return catalogLabel;
  const detail = String(raw).trim();
  if (!detail) return catalogLabel;
  return detail;
}

/** Retire les clés `*__autre_detail` si le select parent n’est plus « autre ». */
export function stripOrphanAutreDetailKeys(co: Record<string, string | number>): void {
  for (const key of Object.keys(co)) {
    if (!isCareAutreDetailKey(key)) continue;
    const base = key.slice(0, -CARE_AUTRE_DETAIL_SUFFIX.length);
    if (!isAutreSelectValue(co[base])) delete co[key];
  }
}
