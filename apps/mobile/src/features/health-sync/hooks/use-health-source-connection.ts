import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { readDeviceHealthAccess } from '../native/health-authorization';
import type { HealthSourceRevokeSheetProps } from '../components/HealthSourceRevokeSheet';
import { useToast } from '@/providers/ToastProvider';
import { revokeHealthSource } from '../api/health.service';
import { useHealthDashboard, useHealthSources, useHealthSyncs } from './use-health-dashboard';
import { useHealthSync } from './use-health-sync';
import { healthRecordQueryKeys } from '@/features/health-record/hooks/use-health-record-completion';
import { getHealthPlatformUiConfig } from '../utils/health-platform-config';

function pickLatestSyncAt(
  dashboardLast?: string | null,
  syncs?: Array<{ started_at: string; status: string }>,
  sources?: Array<{ updated_at?: string; created_at?: string }>,
): string | null {
  const candidates: string[] = [];
  if (dashboardLast) candidates.push(dashboardLast);
  for (const s of syncs ?? []) {
    if (s.status === 'completed') candidates.push(s.started_at);
  }
  for (const src of sources ?? []) {
    if (src.updated_at) candidates.push(src.updated_at);
    else if (src.created_at) candidates.push(src.created_at);
  }
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

export function useHealthSourceConnection() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const sourcesQ = useHealthSources();
  const dashboardQ = useHealthDashboard(30);
  const syncsQ = useHealthSyncs();
  const { sync, syncing } = useHealthSync();
  const platform = getHealthPlatformUiConfig();

  const deviceAccessQ = useQuery({
    queryKey: ['health', 'device-access'],
    queryFn: readDeviceHealthAccess,
    staleTime: 0,
  });
  useAppForegroundRefetch(deviceAccessQ.refetch);

  const activeSources = (sourcesQ.data ?? []).filter((s) => !s.revoked_at);
  const connected = activeSources.length > 0 && deviceAccessQ.data !== 'revoked';
  const primarySource = activeSources[0] ?? null;
  const lastSyncAt = pickLatestSyncAt(
    dashboardQ.data?.summary?.last_sync_at,
    syncsQ.data,
    activeSources,
  );

  const connectOrSync = useCallback(async () => {
    const ok = await sync();
    await Promise.all([sourcesQ.refetch(), dashboardQ.refetch(), syncsQ.refetch(), deviceAccessQ.refetch()]);
    return ok;
  }, [dashboardQ, deviceAccessQ, sourcesQ, syncsQ, sync]);

  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  /** Ouvre la confirmation ; la révocation se fait dans `revokeSheet.onConfirm`. */
  const revokeConnection = useCallback(() => {
    if (primarySource) setRevokeOpen(true);
  }, [primarySource]);

  const confirmRevoke = useCallback(async () => {
    if (!primarySource) return;
    setRevoking(true);
    try {
      await revokeHealthSource(primarySource.id);
      await Promise.all([sourcesQ.refetch(), dashboardQ.refetch(), syncsQ.refetch()]);
      void qc.invalidateQueries({ queryKey: healthRecordQueryKeys.recap });
      void qc.invalidateQueries({ queryKey: healthRecordQueryKeys.completion });
      setRevokeOpen(false);
      toast(`${platform.name} déconnecté`, { type: 'success' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Déconnexion impossible', { type: 'error' });
    } finally {
      setRevoking(false);
    }
  }, [dashboardQ, platform.name, primarySource, qc, sourcesQ, syncsQ, toast]);

  const revokeSheet: HealthSourceRevokeSheetProps = {
    visible: revokeOpen,
    platformName: platform.name,
    loading: revoking,
    onConfirm: () => void confirmRevoke(),
    onClose: () => setRevokeOpen(false),
  };

  const invalidateAll = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['health'] });
  }, [qc]);

  const refetchAll = useCallback(async () => {
    await Promise.all([sourcesQ.refetch(), dashboardQ.refetch(), syncsQ.refetch()]);
  }, [dashboardQ, sourcesQ, syncsQ]);

  return {
    connected,
    lastSyncAt,
    primarySource,
    activeSources,
    syncing,
    connectOrSync,
    revokeConnection,
    revokeSheet,
    invalidateAll,
    refetchAll,
    sourcesQ,
    dashboardQ,
    syncsQ,
  };
}
