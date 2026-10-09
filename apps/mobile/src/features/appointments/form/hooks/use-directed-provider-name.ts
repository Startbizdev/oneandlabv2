import { useQuery } from '@tanstack/react-query';
import type { DirectedProvider, DirectedProviderType } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { fetchProviderName } from '../../api/provider-name.service';

const FALLBACK_NAME: Record<DirectedProviderType, string> = {
  nurse: 'votre infirmier',
  lab: 'votre laboratoire',
  pro: 'votre professionnel de santé',
};

/** Nom du soignant présélectionné ; libellé générique tant qu'il n'est pas chargé. */
export function useDirectedProviderName(provider: DirectedProvider | null): string | null {
  const nameQ = useQuery({
    queryKey: queryKeys.profile.providerName(provider?.id ?? ''),
    queryFn: () => fetchProviderName(provider?.id ?? ''),
    enabled: Boolean(provider),
    staleTime: 5 * 60_000,
  });
  if (!provider) return null;
  return nameQ.data?.name.trim() || FALLBACK_NAME[provider.type];
}
