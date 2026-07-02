import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { HealthBatchPayload } from '@oneandlab/shared-types';
import { useToast } from '@/providers/ToastProvider';
import { postHealthMetricsBatch } from '../api/health.service';
import { readHealthMetricsFromDevice } from '../native/read-health-metrics';
import { useInvalidateHealth } from './use-health-dashboard';
import { healthRecordQueryKeys } from '@/features/health-record/hooks/use-health-record-completion';
import { useQueryClient } from '@tanstack/react-query';

export function useHealthSync() {
  const { show: toast } = useToast();
  const invalidate = useInvalidateHealth();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const read = await readHealthMetricsFromDevice(30);
      if (!read.available) {
        toast(read.reason ?? 'Synchronisation santé indisponible sur cet appareil', { type: 'info' });
        return false;
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
      void qc.invalidateQueries({ queryKey: healthRecordQueryKeys.recap });
      void qc.invalidateQueries({ queryKey: healthRecordQueryKeys.completion });

      if (read.metrics.length === 0) {
        toast('Source connectée — aucune mesure récente dans les 30 derniers jours', { type: 'info' });
      } else if (result.inserted > 0) {
        toast(
          `${result.inserted} mesure${result.inserted > 1 ? 's' : ''} synchronisée${result.inserted > 1 ? 's' : ''}`,
          { type: 'success' },
        );
      } else {
        toast('Données déjà à jour', { type: 'success' });
      }
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Synchronisation impossible', { type: 'error' });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [invalidate, qc, toast]);

  return { sync, syncing };
}
