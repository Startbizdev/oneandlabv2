import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
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

  const activeSources = (sourcesQ.data ?? []).filter((s) => !s.revoked_at);
  const connected = activeSources.length > 0;
  const primarySource = activeSources[0] ?? null;
  const lastSyncAt = pickLatestSyncAt(
    dashboardQ.data?.summary?.last_sync_at,
    syncsQ.data,
    activeSources,
  );

  const connectOrSync = useCallback(async () => {
    const ok = await sync();
    await Promise.all([sourcesQ.refetch(), dashboardQ.refetch(), syncsQ.refetch()]);
    return ok;
  }, [dashboardQ, sourcesQ, syncsQ, sync]);

  const revokeConnection = useCallback(() => {
    if (!primarySource) return;
    Alert.alert(
      `Déconnecter ${platform.name} ?`,
      'Cary ne lira plus vos données depuis cette source. Vous pourrez vous reconnecter à tout moment.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await revokeHealthSource(primarySource.id);
                await Promise.all([
                  sourcesQ.refetch(),
                  dashboardQ.refetch(),
                  syncsQ.refetch(),
                ]);
                void qc.invalidateQueries({ queryKey: healthRecordQueryKeys.recap });
                void qc.invalidateQueries({ queryKey: healthRecordQueryKeys.completion });
                toast(`${platform.name} déconnecté`, { type: 'success' });
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Déconnexion impossible', { type: 'error' });
              }
            })();
          },
        },
      ],
    );
  }, [dashboardQ, platform.name, primarySource, qc, sourcesQ, syncsQ, toast]);

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
    invalidateAll,
    refetchAll,
    sourcesQ,
    dashboardQ,
    syncsQ,
  };
}
