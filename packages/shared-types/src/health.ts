export type HealthMetricType =
  | 'weight'
  | 'height'
  | 'heart_rate'
  | 'steps'
  | 'active_energy'
  | 'distance'
  | 'activity_minutes'
  | 'sleep_hours';

export type HealthPlatform = 'ios' | 'android';

export interface HealthMetricPoint {
  metric_type: HealthMetricType;
  value: number;
  unit: string;
  recorded_at: string;
}

export interface HealthMetricWindowStats {
  sample_count: number;
  avg: number;
  min: number;
  max: number;
  last_recorded_at?: string | null;
}

export interface HealthMetricsSummary {
  has_data: boolean;
  last_sync_at?: string | null;
  windows: {
    '7d': { days: number; metrics: Partial<Record<HealthMetricType, HealthMetricWindowStats>> };
    '30d': { days: number; metrics: Partial<Record<HealthMetricType, HealthMetricWindowStats>> };
  };
}

export interface HealthSource {
  id: string;
  platform: HealthPlatform;
  source_kind: string;
  external_source_id: string;
  display_name?: string | null;
  revoked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HealthSync {
  id: string;
  source_id: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  error_message?: string | null;
  metrics_count: number;
  source_name?: string | null;
}

export interface HealthBatchMetricInput {
  metric_type: HealthMetricType;
  value: number;
  unit?: string;
  recorded_at: string;
  external_id: string;
  metadata?: Record<string, unknown>;
}

export interface HealthBatchPayload {
  platform: HealthPlatform;
  external_source_id?: string;
  display_name?: string;
  permissions?: Record<string, boolean>;
  connected_device_id?: string;
  metrics: HealthBatchMetricInput[];
}

export interface HealthBatchResult {
  sync_id: string;
  source_id: string;
  inserted: number;
  skipped_duplicates: number;
  total_received: number;
}

export interface ConnectedDevice {
  id: string;
  vendor: string;
  model?: string | null;
  external_device_id: string;
  health_source_id?: string | null;
  paired_at?: string;
  revoked_at?: string | null;
}

export interface HealthDashboardData {
  metrics: HealthMetricPoint[];
  summary: HealthMetricsSummary;
}
