import type { MobileAppVersionPolicy } from '@oneandlab/shared-types';
import { api } from '@/api/client';

export async function fetchMobileAppVersionPolicy(): Promise<MobileAppVersionPolicy> {
  const res = await api.get<MobileAppVersionPolicy>('/app/version');
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Impossible de vérifier la version de l’application');
  }
  return res.data;
}
