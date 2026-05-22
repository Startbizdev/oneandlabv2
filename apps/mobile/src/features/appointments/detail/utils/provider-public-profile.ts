/** Chemins fiche publique Nuxt (parité web). */
export function providerPublicProfilePath(
  providerType: 'nurse' | 'lab',
  slug: string,
): string {
  const s = slug.trim();
  if (!s) return '';
  return providerType === 'nurse' ? `/infirmier/${s}` : `/Laboratoire/${s}`;
}

export type CreatorOrigin = {
  kind?: 'patient_platform' | 'nurse' | 'pro' | 'lab_team';
  label?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  public_slug?: string;
  emploi?: string;
  adeli?: string;
  role?: string;
};

export function creatorOriginTitle(origin: CreatorOrigin): string {
  switch (origin.kind) {
    case 'patient_platform':
      return 'Origine';
    case 'nurse':
      return 'Rendez-vous pris par';
    case 'pro':
      return 'Professionnel';
    case 'lab_team':
      return 'Équipe laboratoire';
    default:
      return 'Origine';
  }
}

export function creatorOriginName(origin: CreatorOrigin): string {
  if (origin.kind === 'patient_platform') {
    return origin.label?.trim() || 'Plateforme Cary';
  }
  const parts = [origin.first_name, origin.last_name].filter(Boolean).join(' ').trim();
  return parts || origin.display_name?.trim() || '—';
}
