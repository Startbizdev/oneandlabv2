import type {
  ConnectedDevice,
  HealthBatchPayload,
  HealthBatchResult,
  HealthDashboardData,
  HealthSource,
  HealthSync,
} from '@oneandlab/shared-types';
import { apiRequest } from '@/api/client';

export async function fetchHealthDashboard(days = 30): Promise<HealthDashboardData> {
  const res = await apiRequest<HealthDashboardData>(`/health/metrics?days=${days}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Données santé indisponibles');
  return res.data;
}

export async function fetchHealthSources(): Promise<HealthSource[]> {
  const res = await apiRequest<HealthSource[]>('/health/sources');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Sources indisponibles');
  return res.data;
}

export async function fetchHealthSyncs(limit = 20): Promise<HealthSync[]> {
  const res = await apiRequest<HealthSync[]>(`/health/syncs?limit=${limit}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Historique sync indisponible');
  return res.data;
}

export async function fetchConnectedDevices(): Promise<ConnectedDevice[]> {
  const res = await apiRequest<ConnectedDevice[]>('/health/devices');
  if (!res.success || !res.data) throw new Error(res.error ?? 'Appareils indisponibles');
  return res.data;
}

export async function postHealthMetricsBatch(payload: HealthBatchPayload): Promise<HealthBatchResult> {
  const res = await apiRequest<HealthBatchResult>('/health/metrics/batch', {
    method: 'POST',
    body: payload,
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Synchronisation échouée');
  return res.data;
}

export async function revokeHealthSource(sourceId: string): Promise<void> {
  const res = await apiRequest<{ revoked: boolean }>(`/health/sources/${sourceId}`, {
    method: 'DELETE',
  });
  if (!res.success) throw new Error(res.error ?? 'Révocation impossible');
}

export async function pairHealthDevice(input: {
  vendor: string;
  external_device_id: string;
  model?: string;
  health_source_id?: string;
}): Promise<ConnectedDevice> {
  const res = await apiRequest<ConnectedDevice>('/health/devices/pair', {
    method: 'POST',
    body: input,
  });
  if (!res.success || !res.data) throw new Error(res.error ?? 'Appairage impossible');
  return res.data;
}

export async function revokeHealthDevice(deviceId: string): Promise<void> {
  const res = await apiRequest<{ revoked: boolean }>(`/health/devices/${deviceId}`, {
    method: 'DELETE',
  });
  if (!res.success) throw new Error(res.error ?? 'Suppression appareil impossible');
}
