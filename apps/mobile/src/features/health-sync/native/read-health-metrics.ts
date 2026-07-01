import type { HealthBatchMetricInput, HealthMetricType } from '@oneandlab/shared-types';
import { Platform } from 'react-native';
import { readAndroidHealthMetrics } from '../native/read-android-health';
import { readIosHealthMetrics } from '../native/read-ios-health';

export type HealthReadResult = {
  available: boolean;
  reason?: string;
  permissions?: Record<string, boolean>;
  metrics: HealthBatchMetricInput[];
};

export async function readHealthMetricsFromDevice(days = 30): Promise<HealthReadResult> {
  if (Platform.OS === 'ios') {
    return readIosHealthMetrics(days);
  }
  if (Platform.OS === 'android') {
    return readAndroidHealthMetrics(days);
  }
  return { available: false, reason: 'Plateforme non supportée', metrics: [] };
}

export function filterMetricPoints(
  metrics: HealthBatchMetricInput[],
  type: HealthMetricType,
): HealthBatchMetricInput[] {
  return metrics.filter((m) => m.metric_type === type);
}
