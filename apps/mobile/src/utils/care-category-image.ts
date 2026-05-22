import { getApiBase } from '@/config/env';

/** URL absolue pour `care_categories.image_url` ou champ RDV. */
export function resolveCareCategoryImageSrc(
  imageUrl: string | null | undefined,
): string | null {
  const raw = imageUrl != null ? String(imageUrl).trim() : '';
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const base = getApiBase().replace(/\/$/, '');
  const origin = base.replace(/\/api$/i, '');
  return `${origin}${path}`;
}
