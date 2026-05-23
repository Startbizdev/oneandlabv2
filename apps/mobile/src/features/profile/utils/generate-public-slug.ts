/** Slug URL profil public — aligné `frontend/pages/profile/index.vue` (`generatePublicSlug`). */
function slugifySegment(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Slug infirmier : `prenom-nom`. */
export function generateNursePublicSlug(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const slug = slugifySegment(`${firstName ?? ''}-${lastName ?? ''}`);
  return slug || 'profil';
}
