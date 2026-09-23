import { useQuery } from '@tanstack/react-query';
import {
  canShowOrderTab,
  canShowReceiveTab,
  isPharmacyAccount,
  type PharmacyAccessUser,
} from '@oneandlab/shared-utils';
import { fetchPharmacyModuleFlags } from '../api/pharmacy-orders.service';
import { useAuthStore } from '@/store/auth-store';
import { fetchUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';

export function usePharmacyModuleEnabled() {
  const user = useAuthStore((s) => s.user);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const flagsQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.flags(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchPharmacyModuleFlags();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Module indisponible');
      return res.data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const profileExtra = profileQ.data as
    | (typeof profileQ.data & {
        pharmacy_orders_enabled?: boolean | number | null;
        pharmacy_orders_paused?: boolean | number | null;
      })
    | undefined;

  const accessUser: PharmacyAccessUser = {
    role: user?.role,
    emploi: profileExtra?.emploi ?? null,
    pharmacy_orders_enabled: profileExtra?.pharmacy_orders_enabled,
    pharmacy_orders_paused: profileExtra?.pharmacy_orders_paused,
  };

  const flags = flagsQ.data;
  const canOrder = flags ? canShowOrderTab(accessUser, flags) : false;
  const canReceive = flags ? canShowReceiveTab(accessUser, flags) : false;
  const ownPharmacy = Boolean(flags?.is_pharmacy_account) || canReceive || isPharmacyAccount(accessUser);

  return {
    loading: flagsQ.isLoading || profileQ.isLoading,
    moduleEnabled: Boolean(flags?.module_enabled),
    canOrder,
    canReceive,
    isOwnPharmacy: ownPharmacy,
    flags,
  };
}
