import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHealthDashboard, useHealthSources } from './use-health-dashboard';
import { useHealthSync } from './use-health-sync';

export function useHealthSourceConnection() {
  const qc = useQueryClient();
  const sourcesQ = useHealthSources();
  const dashboardQ = useHealthDashboard(30);
  const { sync, syncing } = useHealthSync();

  const activeSources = (sourcesQ.data ?? []).filter((s) => !s.revoked_at);
  const connected = activeSources.length > 0;
  const lastSyncAt = dashboardQ.data?.summary?.last_sync_at ?? null;
  const primarySource = activeSources[0] ?? null;

  const connectOrSync = useCallback(async () => {
    await sync();
    await Promise.all([sourcesQ.refetch(), dashboardQ.refetch()]);
  }, [dashboardQ, sourcesQ, sync]);

  const invalidateAll = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['health'] });
  }, [qc]);

  return {
    connected,
    lastSyncAt,
    primarySource,
    activeSources,
    syncing,
    connectOrSync,
    invalidateAll,
    sourcesQ,
    dashboardQ,
  };
}
