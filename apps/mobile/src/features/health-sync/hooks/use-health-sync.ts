import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { HealthBatchPayload } from '@oneandlab/shared-types';
import { useToast } from '@/providers/ToastProvider';
import { postHealthMetricsBatch } from '../api/health.service';
import { readHealthMetricsFromDevice } from '../native/read-health-metrics';
import { useInvalidateHealth } from './use-health-dashboard';

export function useHealthSync() {
  const { show: toast } = useToast();
  const invalidate = useInvalidateHealth();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const read = await readHealthMetricsFromDevice(30);
      if (!read.available) {
        toast(read.reason ?? 'Synchronisation santé indisponible sur cet appareil', { type: 'info' });
        return;
      }
      if (read.metrics.length === 0) {
        toast('Aucune nouvelle mesure à importer', { type: 'info' });
        return;
      }

      const payload: HealthBatchPayload = {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        external_source_id: Platform.OS === 'ios' ? 'apple_health' : 'health_connect',
        display_name: Platform.OS === 'ios' ? 'Apple Santé' : 'Health Connect',
        permissions: read.permissions,
        metrics: read.metrics,
      };

      const result = await postHealthMetricsBatch(payload);
      invalidate();
      toast(
        result.inserted > 0
          ? `${result.inserted} mesure${result.inserted > 1 ? 's' : ''} synchronisée${result.inserted > 1 ? 's' : ''}`
          : 'Données déjà à jour',
        { type: 'success' },
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Synchronisation impossible', { type: 'error' });
    } finally {
      setSyncing(false);
    }
  }, [invalidate, toast]);

  return { sync, syncing };
}
