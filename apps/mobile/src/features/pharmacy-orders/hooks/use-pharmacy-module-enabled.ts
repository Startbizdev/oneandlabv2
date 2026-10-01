import { useQuery } from '@tanstack/react-query';
import { canShowOrderTab, canShowReceiveTab } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { pharmacyModuleFlagsQueryOptions } from './pharmacy-module-flags-query';

/** Droits pharmacie calculés par le serveur (`GET /pharmacy-module/config`, emplois receveurs inclus). */
export function usePharmacyModuleEnabled() {
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const flagsQ = useQuery({ ...pharmacyModuleFlagsQueryOptions(userId), enabled: !!userId });

  const flags = flagsQ.data;

  return {
    loading: flagsQ.isLoading,
    error: flagsQ.error,
    refetch: flagsQ.refetch,
    canOrder: flags ? canShowOrderTab(flags) : false,
    canReceive: flags ? canShowReceiveTab(flags) : false,
    isOwnPharmacy: Boolean(flags?.is_pharmacy_account),
  };
}
