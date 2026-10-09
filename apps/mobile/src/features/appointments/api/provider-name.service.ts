import { api } from '@/api/client';

export type PublicProviderName = { name: string; role: string };

/** Nom affichable d'un soignant (même source que la réservation web depuis une fiche publique). */
export async function fetchProviderName(providerId: string): Promise<PublicProviderName> {
  const res = await api.get<PublicProviderName>(`/public/provider-name?id=${encodeURIComponent(providerId)}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Soignant introuvable');
  return res.data;
}
