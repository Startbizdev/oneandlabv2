import { api } from '@/api/client';
import type { AuthUser } from '@oneandlab/shared-types';
import type { NurseCategoryPreference, ProfileUserData } from '@/features/profile/types/profile.types';

export async function fetchUser(id: string) {
  return api.get<ProfileUserData & AuthUser>(`/users/${id}`);
}

export async function updateUser(id: string, body: Record<string, unknown>) {
  return api.put<AuthUser>(`/users/${id}`, body);
}

export async function updateProfileImages(
  userId: string,
  images: { profile_image_url?: string | null; cover_image_url?: string | null },
) {
  return api.put<AuthUser>(`/users/${userId}`, images);
}

export interface CoverageZone {
  id: string;
  owner_id?: string;
  role?: string;
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
  label?: string;
}

export async function fetchCoverageZones(ownerId: string, role: string) {
  return api.get<CoverageZone[]>(`/coverage-zones?owner_id=${ownerId}&role=${role}`);
}

export async function saveCoverageZone(body: {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  role: string;
  owner_id?: string;
}) {
  return api.post<{ id: string }>('/coverage-zones', body);
}

/** Préférences soins infirmier (route authentifiée, pas /users/:id/…) */
export async function fetchNurseCategoryPreferences() {
  return api.get<NurseCategoryPreference[]>('/nurse-category-preferences');
}

export async function updateNurseCategoryPreference(categoryId: string, isEnabled: boolean) {
  return api.put('/nurse-category-preferences', {
    category_id: categoryId,
    is_enabled: isEnabled,
  });
}
