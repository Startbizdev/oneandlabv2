/**
 * Aligné apps/mobile/src/utils/rdv-care-display-label.ts
 * Libellé « Autre » → texte saisi dans « Précisez » (catégorie ou select autre).
 */
import {
  careAutreDetailKey,
  isAutreSelectValue,
  isCareAutreDetailKey,
} from '~/utils/care-category-autre-detail';

export function isAutreCareDisplayLabel(label: string): boolean {
  const t = label.trim().toLowerCase();
  return t === 'autre' || t === 'other' || /^autre\b/.test(t);
}

const AUTRE_CATEGORY_TEXT_KEYS = ['preciser', 'precisez'] as const;

const SKIP_DETAIL_VALUES = new Set(['autre', 'other', '']);

function pickDetail(raw: unknown): string {
  const detail = String(raw ?? '').trim();
  if (!detail || SKIP_DETAIL_VALUES.has(detail.toLowerCase())) return '';
  return detail;
}

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

/**
 * Badge tournée / passage : libellé catégorie seul (sans options entre parenthèses).
 * Les options catalogue restent en lignes « Type : … » sous les badges.
 */
export function careCatalogBadgeBaseLabel(
  rawLabel: string,
  categoryName?: string | null,
  fallback = 'Soin',
): string {
  const cat = String(categoryName ?? '').trim();
  if (cat) return cat;
  const label = rawLabel.trim();
  if (!label) return fallback;
  const withoutParen = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return withoutParen || label || fallback;
}

/** Ne pas répéter « Précisez » sous le titre quand il sert déjà de libellé de carte. */
export function shouldHideAutrePreciserDetailRow(
  categoryLabel: string | undefined,
  optionKey: string,
): boolean {
  if (!categoryLabel || !isAutreCareDisplayLabel(categoryLabel)) return false;
  return (AUTRE_CATEGORY_TEXT_KEYS as readonly string[]).includes(optionKey);
}

export function mapCareOptionsRecord(raw: unknown): Record<string, string | number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === '' || v === undefined || v === null) continue;
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
