import { getApiBase } from '@/config/env';
import { avatarDisplaySeed, personasAvatarUrl } from '@/lib/images/dicebear-personas-url';

/** URL affichable pour profile_image_url / cover_image_url (aligné web useProfileImageUrl). */
export function resolveProfileImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    const base = getApiBase().replace(/\/api\/?$/, '');
    return `${base}${trimmed}`;
  }
  const base = getApiBase().replace(/\/$/, '');
  return `${base}/${trimmed}`;
}

/** Photo de profil ou avatar Personas (DiceBear) si absente. */
export function resolveAvatarImageUrl(
  url: string | null | undefined,
  seed: string,
  sizePx = 128,
  gender?: string | null,
): string {
  const resolved = resolveProfileImageUrl(url);
  if (resolved) return resolved;
  return personasAvatarUrl(avatarDisplaySeed(seed), sizePx, gender);
}
