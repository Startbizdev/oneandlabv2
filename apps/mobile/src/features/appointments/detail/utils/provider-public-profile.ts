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
  id?: string;
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
    return platformOriginDisplayName(origin.label);
  }
  const parts = [origin.first_name, origin.last_name].filter(Boolean).join(' ').trim();
  return parts || origin.display_name?.trim() || '—';
}

/** Normalise le libellé plateforme (oneandlab → Cary). */
export function platformOriginDisplayName(label?: string | null): string {
  const s = String(label ?? '')
    .trim()
    .replace(/^patient\s+/i, '')
    .trim();
  const compact = s.replace(/\s+/g, '').toLowerCase();
  if (!compact || compact === 'cary' || compact === 'oneandlab' || compact === 'onenandlab') {
    return 'Cary';
  }
  return s;
}

export function isPatientPlatformOrigin(origin?: CreatorOrigin | null): boolean {
  return origin?.kind === 'patient_platform';
}

/** Viewer connecté = créateur du RDV (ne pas afficher sa propre fiche intervenant). */
export function isViewerAppointmentCreator(
  apt: { created_by?: string | null; creator_origin?: CreatorOrigin | null },
  viewerUserId?: string | null,
): boolean {
  if (!viewerUserId) return false;
  const viewerId = String(viewerUserId);
  const createdBy = String(apt.created_by ?? '').trim();
  if (createdBy && createdBy === viewerId) return true;
  const creatorId = String(apt.creator_origin?.id ?? '').trim();
  return Boolean(creatorId && creatorId === viewerId);
}

export function creatorOriginSubtitle(origin: CreatorOrigin): string | undefined {
  if (origin.kind === 'patient_platform') {
    return 'Ce rendez-vous a été pris en direct par le patient';
  }
  if (origin.kind === 'pro') {
    return origin.emploi?.trim() || undefined;
  }
  return undefined;
}
