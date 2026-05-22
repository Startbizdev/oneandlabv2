/** Chemin web du profil public infirmier (aligné `frontend/pages/profile/index.vue`). */
export function nursePublicProfilePath(slug: string): string {
  const s = slug.trim();
  return `/infirmier/${s}`;
}
