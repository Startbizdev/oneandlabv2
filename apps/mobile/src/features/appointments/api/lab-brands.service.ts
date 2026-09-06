import { api } from '@/api/client';
import type { LabBrandPublic } from '@oneandlab/shared-types';

export async function fetchPublicLabBrands(): Promise<LabBrandPublic[]> {
  const res = await api.get<LabBrandPublic[]>('/public/lab-brands');
  if (!res?.success || !Array.isArray(res.data)) {
    throw new Error('Impossible de charger les laboratoires.');
  }
  return res.data;
}
