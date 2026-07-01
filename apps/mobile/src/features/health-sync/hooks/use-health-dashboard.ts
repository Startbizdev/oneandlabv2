import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HealthDashboardData } from '@oneandlab/shared-types';
import { fetchHealthDashboard, fetchHealthSources, fetchHealthSyncs } from '../api/health.service';

export const healthQueryKeys = {
  dashboard: (days: number) => ['health', 'dashboard', days] as const,
  sources: ['health', 'sources'] as const,
  syncs: ['health', 'syncs'] as const,
};

export function useHealthDashboard(days = 30) {
  return useQuery({
    queryKey: healthQueryKeys.dashboard(days),
    queryFn: () => fetchHealthDashboard(days),
  });
}

export function useHealthSources() {
  return useQuery({
    queryKey: healthQueryKeys.sources,
    queryFn: fetchHealthSources,
  });
}

export function useHealthSyncs() {
  return useQuery({
    queryKey: healthQueryKeys.syncs,
    queryFn: () => fetchHealthSyncs(),
  });
}

export function useInvalidateHealth() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['health'] });
  };
}

export function pickMetricSeries(data: HealthDashboardData | undefined, type: string) {
  return (data?.metrics ?? []).filter((m) => m.metric_type === type);
}
