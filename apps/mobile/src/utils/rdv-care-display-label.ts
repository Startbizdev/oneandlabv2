import {
  careAutreDetailKey,
  isAutreSelectValue,
  isCareAutreDetailKey,
} from '@oneandlab/shared-constants';

/** Libellé catalogue « Autre » sans précision (catégorie ou option select). */
export function isAutreCareDisplayLabel(label: string): boolean {
  const t = label.trim().toLowerCase();
  return t === 'autre' || t === 'other' || /^autre\b/.test(t);
}

/** Champ texte de la catégorie catalogue « Autre » (migration `preciser`). */
const AUTRE_CATEGORY_TEXT_KEYS = ['preciser', 'precisez'] as const;

const SKIP_DETAIL_VALUES = new Set(['autre', 'other', '']);

function pickDetail(raw: unknown): string {
  const detail = String(raw ?? '').trim();
  if (!detail || SKIP_DETAIL_VALUES.has(detail.toLowerCase())) return '';
  return detail;
}

/**
 * Texte « Précisez » pour un libellé Autre uniquement :
 * - clés `*__autre_detail` (select = autre)
 * - clé `preciser` / `precisez` (catégorie Autre)
 */
export function extractCareOptionsAutreDetail(
  careOptions?: Record<string, string | number> | null,
): string {
  if (!careOptions) return '';

  for (const [key, val] of Object.entries(careOptions)) {
    if (!isCareAutreDetailKey(key)) continue;
    const detail = pickDetail(val);
    if (detail) return detail;
  }

  for (const key of AUTRE_CATEGORY_TEXT_KEYS) {
    const detail = pickDetail(careOptions[key]);
    if (detail) return detail;
  }

  for (const [key, val] of Object.entries(careOptions)) {
    if (isCareAutreDetailKey(key)) continue;
    if (!isAutreSelectValue(val)) continue;
    const detail = pickDetail(careOptions[careAutreDetailKey(key)]);
    if (detail) return detail;
  }

  return '';
}

/**
 * Libellé pill liste RDV : remplace « Autre » par la précision saisie.
 * Les autres soins gardent leur libellé catalogue inchangé.
 */
export function resolveRdvCareDisplayLabel(
  rawLabel: string,
  careOptions?: Record<string, string | number> | null,
  extraCareOptions?: Record<string, string | number> | null,
): string {
  const base = rawLabel.trim() || 'Soin';
  if (!isAutreCareDisplayLabel(base)) return base;

  const detail =
    extractCareOptionsAutreDetail(careOptions) ||
    extractCareOptionsAutreDetail(extraCareOptions);
  if (detail) return detail;
  return base;
}
