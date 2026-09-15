import { api } from '@/api/client';
import type { AuthUser } from '@oneandlab/shared-types';
import type { NurseCategoryPreference, ProfileUserData } from '@/features/profile/types/profile.types';

export type UserFetchScope = 'full' | 'mobile';

export async function fetchUser(id: string, scope: UserFetchScope = 'mobile') {
  const q = scope === 'full' ? '' : '?scope=mobile';
  const res = await api.get<ProfileUserData & AuthUser>(`/users/${encodeURIComponent(id)}${q}`);
  if (!res.success || !res.data || res.data.id !== id) throw new Error(res.error ?? 'Profil indisponible');
  const data = { ...res.data };
  const fields = data as Record<string, unknown>;
  for (const field of ['is_public_profile_enabled', 'is_accepting_appointments', 'accept_rdv_saturday', 'accept_rdv_sunday', 'prescription_generation_enabled']) {
    if (fields[field] === '0' || fields[field] === 0) fields[field] = false;
    if (fields[field] === '1' || fields[field] === 1) fields[field] = true;
  }
  return { ...res, data };
}

export async function updateUser(id: string, body: Record<string, unknown>) {
  const res = await api.put<AuthUser>(`/users/${encodeURIComponent(id)}`, body);
  if (!res.success) {
    throw new Error(res.error ?? 'Mise à jour impossible');
  }
  return res;
}

export async function updateProfileImages(
  userId: string,
  images: { profile_image_url?: string | null; cover_image_url?: string | null },
) {
  return updateUser(userId, images);
}

export interface CoverageZone {
  id: string;
  owner_id?: string;
  role?: string;
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
  zone_type?: 'circle' | 'square' | 'polygon';
  bounds_json?: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
    vertices?: { lat: number; lng: number }[];
  };
  label?: string;
}

export async function fetchCoverageZones(ownerId: string, role: string) {
  const res = await api.get<CoverageZone[]>(`/coverage-zones?owner_id=${encodeURIComponent(ownerId)}&role=${encodeURIComponent(role)}`);
  if (!res.success || !Array.isArray(res.data)) throw new Error(res.error ?? 'Zone indisponible');
  return res;
}

export async function saveCoverageZone(body: {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  zone_type?: 'circle' | 'square' | 'polygon';
  bounds_json?: CoverageZone['bounds_json'];
  role: string;
  owner_id?: string;
}) {
  const res = await api.post<{ id: string }>('/coverage-zones', body);
  if (!res.success) throw new Error(res.error ?? 'Enregistrement de la zone impossible');
  return res;
}

/** Préférences soins infirmier (route authentifiée, pas /users/:id/…) */
export async function fetchNurseCategoryPreferences() {
  const res = await api.get<NurseCategoryPreference[]>('/nurse-category-preferences');
  if (!res.success || !Array.isArray(res.data)) throw new Error(res.error ?? 'Préférences de soins indisponibles');
  return { ...res, data: res.data.map(row => {
    const enabled: unknown = row.is_enabled;
    return { ...row, is_enabled: enabled === true || enabled === 1 || enabled === '1' };
  }) };
}

export async function updateNurseCategoryPreference(categoryId: string, isEnabled: boolean) {
  const res = await api.put('/nurse-category-preferences', {
    category_id: categoryId,
    is_enabled: isEnabled,
  });
  if (!res.success) throw new Error(res.error ?? 'Préférence non enregistrée');
  return res;
}
