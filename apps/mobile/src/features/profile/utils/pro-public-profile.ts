/** Chemin web du profil public pro de santé (aligné `frontend/pages/profile/index.vue`). */
export function proPublicProfilePath(slug: string): string {
  const s = slug.trim();
  return `/professionnel/${s}`;
}
